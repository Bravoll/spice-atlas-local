from __future__ import annotations
import argparse
import asyncio
import json
import os
import secrets
import time
from typing import Literal
from contextlib import asynccontextmanager
from atlas.workspaces import workspaces
from atlas.activity import activity
from atlas.health import health, BROWSER_PROBES
from atlas.resources import resource_plan, image_gateways, language_policy, available
from atlas.providers import ARTICLE_VARIANT
from atlas.image_lexicon import lexicon
from atlas.pronunciation import name_metadata, pronunciations
from atlas.launcher_protocol import runtime_identity
from atlas.runtime import runtime,event
from atlas.cache_memory import CACHE_MODE,memory_cache
from atlas.anticipation import Anticipation
from urllib.parse import urlsplit

import httpx
from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from atlas.catalogue import catalogue
from atlas.discovery import GBIF_FAMILIES, WIKI_ROOTS, import_wiki_members, jobs, resolve_entry
from atlas.network import SourceFailure, diagnostics
from atlas.preferences import preferences
from atlas.providers import Reader, WIKIS, entry_for, frame_capability, outbound_images, sources_for
from atlas.storage import ROOT,now_iso
from atlas.other_sources import stream_cards
from atlas.source_registry import registry

@asynccontextmanager
async def lifespan(app):
    health.start()
    yield
    for version in workspaces.list()['versions']:
        with workspaces.use(version['id']):anticipation.cancel()
    await health.stop()
    for version in workspaces.list()["versions"]:await jobs.pause_all(version["id"])

app=FastAPI(title="Spice Atlas · Live Catalogue",version="0.8.0",lifespan=lifespan)
reader=Reader()
anticipation=Anticipation(reader)

@app.exception_handler(ValueError)
async def invalid_value(request:Request,exc:ValueError):return JSONResponse({"error":str(exc)},status_code=400)

@app.exception_handler(SourceFailure)
async def source_failure(request:Request,exc:SourceFailure):
    status=404 if exc.code=="not_found" else 502
    return JSONResponse({"error":str(exc),"diagnostic":exc.public()},status_code=status)

@app.middleware("http")
async def boundaries(request:Request,call_next):
    if request.method not in {"GET","HEAD","OPTIONS"}:
        origin=request.headers.get("origin")
        if origin and urlsplit(origin).netloc!=request.headers.get("host"):
            return JSONResponse({"error":"Use the local application page."},status_code=403)
        try:
            if int(request.headers.get("content-length","0"))>16_000_000:
                return JSONResponse({"error":"Request body too large"},status_code=413)
        except ValueError:
            return JSONResponse({"error":"Invalid content length"},status_code=400)
    if runtime.paused and request.url.path.startswith('/api/') and request.url.path not in {'/api/status','/api/health','/api/ui-events','/api/runtime/events'} and not request.url.path.startswith(('/api/launcher/','/api/notifications/')):
        return JSONResponse({'error':'Service paused · 请从托盘或状态窗口继续服务','paused':True},status_code=503,headers={'Retry-After':'3'})
    active=workspaces.active_id
    supplied=request.headers.get("X-Atlas-Version")
    if supplied and supplied!=active and request.url.path.startswith("/api/") and not request.url.path.startswith("/api/versions"):
        return JSONResponse({"error":"The active version changed; reload this tab.","active_version":active},status_code=409)
    mode=request.headers.get('X-Atlas-Cache-Mode','foreground')
    if mode not in {'foreground','memory','longterm'}:return JSONResponse({'error':'Unsupported cache mode'},status_code=400)
    if mode!='foreground':
        try:generation=int(request.headers.get('X-Atlas-Prefetch-Generation','-1'))
        except ValueError:generation=-1
        if generation!=anticipation.generations[active]:return JSONResponse({'error':'Prefetch context changed'},status_code=409)
    token=CACHE_MODE.set(mode)
    try:
        with workspaces.use(active):response=await call_next(request)
    finally:CACHE_MODE.reset(token)
    response.headers["X-Atlas-Version"]=workspaces.active_id
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Referrer-Policy"]="strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"]="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; media-src 'self' https://api.dictionaryapi.dev https://upload.wikimedia.org https://ssl.gstatic.com; connect-src 'self' https://zh.wikipedia.org https://en.wikipedia.org https://commons.wikimedia.org; frame-src 'self' https://www.bing.com https://*.bing.com https://www.google.com https://image.baidu.com; object-src 'none'; base-uri 'self'"
    return response

@app.middleware('http')
async def terminal_trace(request:Request,call_next):
    start=time.monotonic();status=500
    try:
        response=await call_next(request);status=response.status_code;return response
    finally:
        event('HTTP',method=request.method,path=request.url.path,status=status,elapsed_ms=round((time.monotonic()-start)*1000))

@app.get("/")
def index():return FileResponse(ROOT/"static/index.html")

@app.post('/api/cache/lookup')
def cache_lookup(value:dict=Body(...)):
    if value.get('track_only'):
        desc=anticipation.descriptor(value.get('resource',{}));anticipation.observe(desc,value.get('event_id',''));return {'hit':False}
    return anticipation.lookup(value.get('resource',{}),value.get('event_id',''),protected_only=bool(value.get('protected_only',False)))

@app.post('/api/cache/operation')
def cache_operation(value:dict=Body(...)):return anticipation.record_operation(value)

@app.get('/api/cache/stats')
def cache_stats():return anticipation.stats()

@app.post('/api/cache/plan')
def cache_plan(value:dict=Body(...)):return anticipation.plan(value)

@app.post('/api/cache/cancel')
def cache_cancel():anticipation.cancel();return {'ok':True}

@app.post('/api/cache/clear-memory')
def clear_speculation():memory_cache.clear(anticipation.store.namespace);return {'ok':True}

@app.post('/api/cache/prefetch')
async def cache_prefetch(value:dict=Body(...)):
    try:return await anticipation.fetch(value.get('resource',{}),value.get('tier','memory'),value.get('generation',-1))
    except asyncio.CancelledError:return JSONResponse({'cancelled':True},status_code=409)

@app.get("/api/catalog")
def catalog(q:str="",scope:Literal["culinary","botanical","all"]="all",node:str|None=None,offset:int=0,limit:int=30,group:str|None=None,collection:Literal["catalogue","favorites","history"]="catalogue"):
    return catalogue.page(q[:150],scope,node,max(0,offset),max(1,min(limit,100)),group,collection,preferences.values()["history_order"])

@app.get("/api/catalog/stats")
def catalog_stats():return catalogue.stats()

@app.get('/api/catalog/random')
def random_record(scope:Literal['culinary','botanical','all']|None=None,exclude:str=''):
    value=catalogue.random_entry(scope or preferences.values()['random_scope'],exclude[:180])
    if not value:raise HTTPException(404,'No eligible local records in this scope')
    return value

@app.get("/api/catalog/nodes")
def nodes(parent:str="root-culinary",language:str="zh-Hans",offset:int=0,limit:int|None=None,path:str=""):
    rows=catalogue.children(parent,language);total=len(rows);offset=max(0,offset);size=min(40,max(1,limit)) if limit is not None else total or 1
    try:ids=json.loads(path[:6000]) if path else []
    except ValueError:ids=[]
    ids=[value for value in ids[:30] if isinstance(value,str) and len(value)<=180] if isinstance(ids,list) else []
    labels={}
    if ids:
        from atlas.localization import to_hant
        with catalogue.connect() as db:
            for row in db.execute('SELECT id,label_zh,label_en FROM nodes WHERE id IN ('+','.join('?' for _ in ids)+')',ids):
                label=(row['label_zh'] or row['label_en']) if language.startswith('zh') else (row['label_en'] or row['label_zh'])
                labels[row['id']]=to_hant(label) if language=='zh-Hant' else label
    return {'parent':parent,'nodes':rows[offset:offset+size],'total':total,'offset':offset,'limit':size,'has_more':offset+size<total,'labels':labels}

@app.get("/api/entry/{entry_id}")
async def entry(entry_id:str,resolve:bool=False,browser_language:str="en"):
    p=preferences.values()
    item=await resolve_entry(entry_id,force=True) if resolve else entry_for(entry_id)
    plan=resource_plan(item,p["ui_language"],browser_language,p["content_language"],health.report())
    return {**item,**name_metadata(item),**plan,"image_gateways":image_gateways(item,mode=p["ui_language"],browser=browser_language,preferred=p["content_language"],report=health.report()),"related":catalogue.related(item),"favorite":any(r["entry_id"]==entry_id for r in activity.collection("favorites"))}

@app.get('/api/pronunciation/{entry_id}')
async def pronunciation(entry_id:str):
    return await pronunciations.for_entry(entry_for(entry_id),online=available('pronunciation_dictionary',health.report()))

@app.get('/api/other-sources/index')
def other_source_index():
    data=registry()
    return {'providers':data['providers'],'sample_count':data['sample_count'],'indexed_entries':len(data['entry_candidates']),'candidate_links':data['selected_candidate_links']}

@app.get('/api/other-sources/{entry_id}/stream')
async def other_source_stream(entry_id:str,request:Request,refresh:bool=False):
    item=entry_for(entry_id);prefs=preferences.values();report=health.report();version=workspaces.current_id
    desc={'kind':'other','entry':entry_id};anticipation.observe(desc,request.headers.get('X-Atlas-Event',''))
    cached=anticipation.lookup(desc,track=False) if not refresh else {'hit':False}
    async def outgoing():
        with workspaces.use(version):
            if cached['hit']:
                yield json.dumps({'type':'start','entry_id':entry_id,'delivery':cached['tier']})+'\n'
                for card in cached['value']['cards']:yield json.dumps({'type':'card','card':card},ensure_ascii=False)+'\n'
                yield json.dumps({'type':'done','cards':len(cached['value']['cards']),'reason':'cache','delivery':cached['tier']})+'\n';return
            cards=[]
            async for record in stream_cards(item,prefs,report):
                if record['type']=='card':cards.append(record['card'])
                if record['type']=='done' and cards and record['reason']!='paused':reader.store.put(anticipation.keys(desc)[0],{'mode':'collection','cards':cards,'fetched_at':now_iso()},900)
                yield json.dumps(record,ensure_ascii=False)+'\n'
    return StreamingResponse(outgoing(),media_type='application/x-ndjson',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

@app.get('/api/wiki-languages/{entry_id}')
async def wiki_languages(entry_id:str,refresh:bool=False):
    from atlas.wiki_languages import resolve_languages
    return await resolve_languages(entry_for(entry_id),reader.store,refresh)

@app.get('/api/source-read/{entry_id}')
async def source_read(entry_id:str,url:str,refresh:bool=False):
    from atlas.web_sources import read_reference
    from atlas.source_registry import provider_for
    profile=provider_for(url)
    if not profile:raise HTTPException(400,'Choose a reviewed public source')
    return await read_reference(entry_for(entry_id),profile['id'],url,reader.store,refresh)

@app.get("/api/article/{entry_id}")
async def article(entry_id:str,source:str="auto",refresh:bool=False,preferred:str="auto",browser_language:str="en"):
    p=preferences.values();item=entry_for(entry_id);plan=resource_plan(item,p['ui_language'],browser_language,p['content_language'] if preferred=='auto' else preferred,health.report());policy=plan['policy']
    selected=next((row for row in plan['sources'] if row['key']==source),None)
    if source=='auto':selected=next(iter(plan['sources']),None) if policy['domestic'] else None
    if selected and selected['id'] not in WIKIS:
        from atlas.web_sources import read_reference,search_articles
        if selected['id'] in {'bing','google'}:
            result=await search_articles(item,selected['service'],selected['query'],selected['language'])
        else:
            try:result=await read_reference(item,selected['id'],selected['url'],reader.store,refresh)
            except (SourceFailure,httpx.HTTPError,TimeoutError) as exc:
                result={'mode':'external','source':selected['id'],'title':selected['name_en'] if policy['ui']=='en' else selected['name'],'source_url':selected['url'],'message':str(exc),'diagnostic':getattr(exc,'public',lambda:{'code':'network_error','message':str(exc)})(),'language':selected['language']}
        if result.get('mode')=='article':
            desc=anticipation.descriptor({'kind':'article','entry':entry_id,'source':selected['id'],'preferred':policy['primary'],'variant':policy['variant']})
            reader.store.put(anticipation.keys(desc)[0],result,900)
        return result
    actual=selected['id'] if selected else source.split(':')[0]
    # Diagnostic reachability never substitutes a search page for article content.
    # Reader retains the v0.6 cache/source fallback pipeline; real requests decide errors.
    token=ARTICLE_VARIANT.set(policy['variant'])
    try:return await reader.article(entry_id,'auto' if source=='auto' else actual,refresh,policy['primary'])
    finally:ARTICLE_VARIANT.reset(token)

@app.get("/api/images/{entry_id}")
async def images(entry_id:str,provider:str="commons",form:str|None=None,refresh:bool=False,browser_language:str="en",profile:str|None=None):
    p=preferences.values();gateways=image_gateways(entry_for(entry_id),form,p['ui_language'],browser_language,p['content_language'],health.report(),profile)
    if provider not in gateways:raise SourceFailure('Image source is temporarily unavailable',code='source_unavailable')
    if provider=='baidu' or provider=='google' and not (p['google_api_key'] and p['google_cse_id']):
        from atlas.web_sources import search_images
        value=await search_images(gateways[provider],provider,reader.store,refresh)
    else:value=await reader.images(entry_id,provider,form,refresh,profile)
    if value.get('images'):
        desc=anticipation.descriptor({'kind':'images','entry':entry_id,'provider':provider,'form':form or entry_for(entry_id)['forms'][0]['id'],'profile':profile or 'auto'})
        reader.store.put(anticipation.keys(desc)[0],value,900)
    value['gateways']=gateways;return value

@app.get("/api/media/{identifier}")
async def media(identifier:str):
    try:
        async with reader.locks.setdefault((workspaces.current_id,"media:"+identifier),asyncio.Lock()):
            path=await reader.image_file(identifier)
        return FileResponse(path,headers={"Cache-Control":"public,max-age=86400"})
    except httpx.HTTPError:
        raise SourceFailure("Image connection failed; try direct delivery.",code="image_unavailable") from None

class TranslationRequest(BaseModel):
    entry_id:str
    source:Literal["zhwiki","enwiki"]
    target:str="zh-Hans"
    variant:str="zh-hans"
    refresh:bool=False
    revision_id:int|str|None=None

@app.post("/api/translate")
async def translate(body:TranslationRequest,request:Request):
    desc=None
    try:desc=anticipation.descriptor({'kind':'translation','entry':body.entry_id,'source':body.source,'target':body.target,'variant':body.variant,'revision':body.revision_id})
    except ValueError:pass
    if desc:
        anticipation.observe(desc,request.headers.get('X-Atlas-Event',''))
        cached=anticipation.lookup(desc,track=False)
        if cached['hit'] and not body.refresh:return cached['value']
    token=ARTICLE_VARIANT.set("zh-hant" if body.variant=="zh-hant" else "zh-hans")
    try:
        result=await reader.translate(body.entry_id,body.source,body.refresh,body.target)
        if desc and result.get('blocks'):reader.store.put(anticipation.keys(desc)[0],result,900)
        return result
    finally:ARTICLE_VARIANT.reset(token)

@app.get("/api/settings")
def settings():return preferences.public()

@app.post("/api/settings")
async def save_settings(value:dict=Body(...)):
    try:
        before=preferences.values();result=preferences.save(value);after=preferences.values();activity.log("settings.save",{"fields":[k for k in value if "key" not in k]})
        connection_keys={"proxy_url","trust_env","timeout_seconds","user_agent","lm_enabled","lm_base_url","lm_model","lm_api_key","google_translate_key","azure_translate_key","azure_region","google_api_key","google_cse_id"}
        if health.loop_task and any(before.get(k)!=after.get(k) for k in connection_keys):health.restart()
        return result
    except ValueError as exc:raise HTTPException(400,str(exc))

@app.post("/api/settings/test-model")
async def test_model():return await reader.model_models()

@app.post("/api/settings/diagnostics")
async def diagnose():
    runtime.needs_retest=False
    health.restart(force=True);return health.browser_plan()

@app.get("/api/status")
def status():
    return {"version":"0.8.0",**runtime_identity(ROOT),**runtime.public(),"active_version":workspaces.active_id,"cache":reader.store.stats(),"catalogue":catalogue.stats(),
            "providers":[{"id":"wikimedia","name":"Wikipedia / Commons","mode":"live_api"},
                         {"id":"wikidata","name":"Wikidata names / aliases","mode":"metadata_api"},
                         {"id":"gbif","name":"GBIF botanical reference","mode":"taxonomy_api"},
                         {"id":"baidu","name":"Baidu","mode":"external"},
                         {"id":"bing","name":"Bing","mode":"frame_if_permitted"},
                         {"id":"google","name":"Google","mode":"existing_key_only"}]}

@app.post('/api/launcher/shutdown')
async def launcher_shutdown(request:Request):
    authorize_launcher(request)
    app.state.launcher_shutdown()
    return {'ok':True}

def authorize_launcher(request):
    expected=os.environ.get('SPICE_LAUNCHER_CONTROL_TOKEN','')
    shutdown=getattr(app.state,'launcher_shutdown',None)
    if not expected or not callable(shutdown):raise HTTPException(404,'Managed launcher is not active')
    if not secrets.compare_digest(request.headers.get('X-Atlas-Launcher',''),expected):raise HTTPException(403,'Launcher authorization required')

@app.post('/api/launcher/control')
async def launcher_control(request:Request,value:dict=Body(...)):
    authorize_launcher(request)
    action=value.get('action')
    if runtime.phase=='pausing':raise HTTPException(409,'A service transition is in progress')
    if action not in {'pause','resume'}:raise HTTPException(400,'Use pause or resume')
    if action=='pause':
        if not runtime.paused:
            runtime.phase='pausing'
            details={'kind':'service.pausing','phase':'pausing'}
            notice_id=activity.notify('服务即将暂停 / Service pausing',details)
            notice=next(n for n in activity.notifications() if n['id']==notice_id)
            runtime.announce('service.pausing',notification=notice,version=workspaces.current_id)
            # SSE is delivered while the content API is still accepting work.
            await asyncio.sleep(.45)
            runtime.paused_jobs=[]
            for version in workspaces.list()['versions']:
                with workspaces.use(version['id']):
                    runtime.paused_jobs.extend((version['id'],job['id']) for job in jobs.list() if job['status'] in {'queued','running'})
        anticipation.cancel()
        runtime.set_paused(True)
        runtime.phase='paused'
        await health.suspend()
        for version in workspaces.list()['versions']:await jobs.pause_all(version['id'])
        if 'notice_id' in locals():
            activity.update_notification(notice_id,'服务已暂停 / Service paused',{'kind':'service.paused','phase':'paused'})
            notice=next((n for n in activity.notifications() if n['id']==notice_id),None)
            runtime.announce('service.paused',notification=notice,version=workspaces.current_id)
    else:
        was_paused=runtime.paused
        runtime.set_paused(False);runtime.phase='running';runtime.needs_retest=was_paused or runtime.needs_retest;health.resume()
        paused_jobs,runtime.paused_jobs=runtime.paused_jobs,[]
        for version_id,job_id in paused_jobs:
            with workspaces.use(version_id):
                job=jobs.get(job_id)
                if job and job['status']=='paused':jobs.start(job)
        if was_paused:
            notice_id=activity.notify('服务已继续，请重新测试连接 / Service resumed; retest connections',{'kind':'service.resumed','action':'retest'})
            runtime.announce('service.resumed',notification=next(n for n in activity.notifications() if n['id']==notice_id),version=workspaces.current_id)
    return {'ok':True,**runtime.public()}

@app.get('/api/runtime/events')
async def runtime_events(request:Request):
    version=workspaces.current_id
    async def messages():
        key,queue=runtime.subscribe()
        try:
            with workspaces.use(version):notices=activity.notifications()
            yield 'data: '+json.dumps({'kind':'snapshot',**runtime.public(),'notifications':notices,'version':version},ensure_ascii=False)+'\n\n'
            while True:
                if await request.is_disconnected():break
                try:value=await asyncio.wait_for(queue.get(),15)
                except asyncio.TimeoutError:
                    yield ': heartbeat\n\n';continue
                yield 'data: '+json.dumps(value,ensure_ascii=False)+'\n\n'
        finally:runtime.listeners.pop(key,None)
    return StreamingResponse(messages(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})

@app.post('/api/ui-events')
def ui_event(value:dict=Body(...)):
    allowed={'action','entry','source','form','scope','control','provider','ok','node','offset','tree_offset','collection'}
    event('UI',**{key:str(val)[:180] for key,val in value.items() if key in allowed and isinstance(val,(str,bool,int))})
    return {'ok':True}

class BrowserIngest(BaseModel):
    entry_id:str
    source:str="enwiki"
    form:str|None=None
    data:dict
    variant:str="zh-hans"
    browser_language:str="en"
    profile:str|None=None

@app.get("/api/browser-plan/article/{entry_id}")
async def browser_article_plan(entry_id:str,source:Literal["zhwiki","enwiki"]="enwiki",variant:str="zh-hans"):
    item=entry_for(entry_id)
    from atlas.wiki_languages import cached_mapping,mapped_entry,resolve_languages
    info=cached_mapping(item,reader.store)
    if not info and not item.get("wiki",{}).get(source):info=await resolve_languages(item,reader.store)
    if info:item=mapped_entry(item,info)
    title=item.get("wiki",{}).get(source) or item.get("scientific") or item["english"]
    return {"url":WIKIS[source]+"/w/api.php","source":source,
            "params":{"action":"parse","page":title,"redirects":1,"prop":"text|tocdata|images|revid|displaytitle",
                      "format":"json","formatversion":2,"origin":"*","disableeditsection":1,
                      "variant":("zh-hant" if variant=="zh-hant" else "zh-hans") if source=="zhwiki" else "en"}}

@app.get("/api/browser-plan/images/{entry_id}")
def browser_images_plan(entry_id:str,form:str|None=None,profile:str|None=None):
    item=entry_for(entry_id);form=form or item["forms"][0]["id"]
    if form not in {f["id"] for f in item["forms"]}:raise HTTPException(400,"Unknown form")
    return {"url":"https://commons.wikimedia.org/w/api.php","form":form,"params":reader.commons_params(item,form,profile),"queries":reader.commons_plans(item,form,profile),"profile":lexicon.queries(item,lexicon.form(item,form,profile))}

@app.post("/api/browser-ingest/article")
def browser_article_ingest(value:BrowserIngest):
    token=ARTICLE_VARIANT.set("zh-hant" if value.variant=="zh-hant" else "zh-hans")
    try:return reader.browser_article(value.entry_id,value.source,value.data)
    finally:ARTICLE_VARIANT.reset(token)

@app.post("/api/browser-ingest/images")
def browser_image_ingest(value:BrowserIngest):
    item=entry_for(value.entry_id)
    form=value.form or item["forms"][0]["id"];result=reader.browser_images(value.entry_id,form,value.data,value.profile);p=preferences.values()
    result["gateways"]=image_gateways(item,form,p["ui_language"],value.browser_language,p["content_language"],health.report(),value.profile);return result

@app.get("/api/frame/{entry_id}")
async def frame(entry_id:str,provider:Literal["bing","google","baidu"],form:str|None=None,browser_language:str="en",profile:str|None=None):
    p=preferences.values();links=image_gateways(entry_for(entry_id),form,p['ui_language'],browser_language,p['content_language'],health.report(),profile)
    if provider not in links:return {'can_try':False,'reason':'Temporarily unavailable','url':''}
    result=await frame_capability(entry_for(entry_id),provider,form,url=links[provider]);result['url']=links[provider];return result

@app.get("/api/discovery/options")
def discovery_options():
    return {"wiki_roots":[{"id":key,"source":v[0],"category":v[1],"label_zh":v[2],"label_en":v[3]} for key,v in WIKI_ROOTS.items()],
            "gbif_families":[{"id":key,"label_en":key,"label_zh":v["zh"],"key":v["key"]} for key,v in GBIF_FAMILIES.items()]}

@app.get("/api/discovery/search")
async def discovery_search(q:str,language:Literal["zh","en"]="zh"):
    from atlas.network import fetch_json
    from atlas.content import plain
    source="zhwiki" if language=="zh" else "enwiki"
    data=await fetch_json(WIKIS[source]+"/w/api.php",{"action":"query","list":"search","srsearch":q[:150],"srlimit":10,"format":"json","formatversion":2})
    return {"source":source,"results":[{"pageid":r["pageid"],"title":r["title"],"snippet":plain(r.get("snippet",""))} for r in data.get("query",{}).get("search",[])]}

class ImportPage(BaseModel):
    source:Literal["zhwiki","enwiki"]
    pageid:int=Field(gt=0)
    title:str

@app.post("/api/discovery/import-page")
async def import_page(value:ImportPage):
    root="wiki-search-import"
    catalogue.node(root,"远程检索导入","Remote search imports","category","culinary",parent="root-culinary")
    await import_wiki_members(value.source,[{"ns":0,"pageid":value.pageid,"title":value.title}],root)
    key=catalogue.find_wiki(value.source,value.title)
    return {"entry_id":key,"stats":catalogue.stats()}

@app.get("/api/jobs")
def list_jobs():return {"jobs":jobs.list()}

class NewJob(BaseModel):
    kind:Literal["wiki","gbif"]
    options:dict={}

@app.post("/api/jobs")
async def create_job(body:NewJob):
    try:job=jobs.create(body.kind,body.options)
    except ValueError as exc:raise HTTPException(400,str(exc))
    jobs.start(job);return jobs.public(job)

@app.post("/api/jobs/{job_id}/pause")
async def pause_job(job_id:str):
    if not jobs.get(job_id):raise HTTPException(404,"Job not found")
    await jobs.pause(job_id);return jobs.public(jobs.get(job_id))

@app.post("/api/jobs/{job_id}/resume")
async def resume_job(job_id:str,value:dict=Body(default={})):
    job=jobs.get(job_id)
    if not job:raise HTTPException(404,"Job not found")
    if job["status"]=="completed":raise HTTPException(409,"Job already completed")
    if "max_categories" in value:
        job["state"]["max_categories"]=max(job["state"].get("max_categories",0),min(int(value["max_categories"]),2000))
    jobs.save(job);activity.log("import.resume",{"job_id":job_id,"progress":job["progress"],"max_categories":job["state"].get("max_categories")});jobs.start(job);return jobs.public(job)

@app.get("/api/export/{entry_id}")
def export(entry_id:str):
    item=entry_for(entry_id);articles=[]
    for source in WIKIS:
        cached,_,_=reader.stored(f"article:{entry_id}:{source}:"+("zh-hans" if source=="zhwiki" else "en"))
        if cached:articles.append(cached)
    return JSONResponse({"entry":item,"sources":sources_for(item),"articles":articles},
                        headers={"Content-Disposition":f'attachment; filename="spice-atlas-{entry_id}.json"'})

@app.get('/api/health')
def health_report():return {**health.report(),'notifications':activity.notifications()}

@app.post('/api/health/round')
async def begin_health_round():return health.begin_for_browser()

@app.get('/api/browser-plan/health')
def browser_health():return health.browser_plan()

@app.post('/api/health/browser')
def browser_health_results(value:dict=Body(...)):return health.browser_results(value.get('results',[])[:3],value.get('round_id'))

@app.post('/api/notifications/{notice_id}/dismiss')
def dismiss_notice(notice_id:str):activity.dismiss(notice_id);return {'ok':True}

@app.get('/api/image-vocabulary')
def vocabulary():return lexicon.summary()

@app.get('/api/catalog/audit')
def audit(offset:int=0,limit:int=40,status:str=''):return catalogue.audit(max(0,offset),max(1,min(100,limit)),status)

@app.get('/api/collections/{kind}')
def collections(kind:Literal['favorites','history']):
    return {'rows':[{**row,'entry':catalogue.get(row['entry_id'])} for row in activity.collection(kind,preferences.values()['history_order']=='custom')]}

@app.post('/api/collections/{kind}/order')
def collection_order(kind:Literal['favorites','history'],value:dict=Body(...)):
    try:activity.reorder(kind,value['order'])
    except (ValueError,KeyError) as exc:raise HTTPException(400,str(exc))
    return {'ok':True}

@app.post('/api/favorite/{entry_id}')
def favorite(entry_id:str,value:dict=Body(...)):
    entry_for(entry_id);activity.favorite(entry_id,bool(value.get('enabled',True)),str(value.get('note','')));return {'ok':True}

@app.post('/api/history/{entry_id}')
def history_entry(entry_id:str):entry_for(entry_id);activity.visit(entry_id);return {'ok':True}

@app.get('/api/logs')
def logs(before:int|None=None,limit:int=100,manager:bool=False):return {'rows':workspaces.manager_logs(before,limit) if manager else activity.events(before,limit)}

VIEW_KEYS={'immersive','exploreReading','readingQuery','nameFonts','entry','form','source','imageProvider','imageProfile','query','scope','node','path','offset','group','collection','mainScroll','catalogScroll','windowScroll','readerMode','textMode','typeStyle','nameChineseStyle','nameWesternStyle','frameOpen','frameFit','frameMode','frameExpanded','anchor','treeOffset','treeLimit','entryLimit','treeScroll','entryScroll','wikiLocale','sourceReadUrl'}
@app.get('/api/view-state')
def view_state():
    path=workspaces.directory()/'view_state.json';return json.loads(path.read_text('utf-8')) if path.exists() else {}

@app.post('/api/view-state')
def save_view(value:dict=Body(...)):
    safe={k:v for k,v in value.items() if k in VIEW_KEYS}
    from atlas.typography import name_fonts
    if 'nameFonts' in safe:safe['nameFonts']=name_fonts(safe['nameFonts'])
    if 'immersive' in safe and not isinstance(safe['immersive'],bool):raise ValueError('Invalid reading mode')
    if 'readingQuery' in safe and (not isinstance(safe['readingQuery'],str) or len(safe['readingQuery'])>120):raise ValueError('Invalid reading query')
    if safe.get('exploreReading') is not None:
        if not isinstance(safe['exploreReading'],dict):raise ValueError('Invalid exploration state')
        safe['exploreReading']={k:v for k,v in safe['exploreReading'].items() if k in {'entry','source','sourceReadUrl','readerMode','textMode','form','imageProvider','imageProfile','mainScroll','windowScroll','frameOpen','frameExpanded','frameMode'}}
    text=json.dumps(safe,ensure_ascii=False)
    if len(text)>20000:raise HTTPException(400,'View state too large')
    path=workspaces.directory()/'view_state.json';tmp=path.with_suffix('.tmp');tmp.write_text(text,'utf-8');tmp.replace(path);return {'ok':True}

@app.get('/api/versions')
def versions():return {**workspaces.list(),'deleted':workspaces.trash()}

@app.post('/api/versions')
async def create_version(value:dict=Body(...)):
    try:
        source=value.get('source_id') or workspaces.active_id
        await jobs.pause_all(source)
        return workspaces.create(value.get('name',''),value.get('mode','copy'),source)
    except ValueError as exc:raise HTTPException(400,str(exc))

@app.post('/api/versions/order')
def order_versions(value:dict=Body(...)):
    try:return workspaces.reorder(value.get('order'),value.get('sort'),value.get('direction','asc'))
    except ValueError as exc:raise HTTPException(400,str(exc))

@app.post('/api/versions/{key}/{action}')
async def version_action(key:str,action:Literal['switch','rename','delete','restore'],value:dict=Body(default={})):
    try:
        if action=='rename':workspaces.rename(key,value.get('name',''))
        elif action=='restore':workspaces.restore(key)
        else:
            await jobs.pause_all(workspaces.active_id)
            if action=='switch':workspaces.switch(key)
            else:
                await jobs.pause_all(key)
                task=health.tasks.pop(key,None)
                if task:task.cancel();await asyncio.gather(task,return_exceptions=True)
                workspaces.remove(key)
            with workspaces.use(workspaces.active_id):
                from atlas.catalogue import Catalogue
                Catalogue(path=workspaces.directory()/'catalogue.sqlite3')
            health.switched()
        return {**workspaces.list(),'deleted':workspaces.trash()}
    except ValueError as exc:raise HTTPException(400,str(exc))

app.mount("/static",StaticFiles(directory=ROOT/"static"),name="static")

if __name__=="__main__":
    import uvicorn
    parser=argparse.ArgumentParser()
    parser.add_argument("--host",default="127.0.0.1");parser.add_argument("--port",type=int,default=8765)
    args=parser.parse_args()
    uvicorn.run(app,host=args.host,port=args.port,log_level="warning")
