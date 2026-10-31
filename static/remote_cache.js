"use strict";
const resourceUi={eventId:'',entry:'',lastAt:Date.now(),timer:0,controller:null,queue:[],running:false,inflight:0,stopped:false};
const remoteActions=new Set(['entry','form','source','imageProfile','provider','language','refreshArticle','refreshImages']);
function resourceEventId(){return window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function resourceContext(action={}){return {entry:action.id||state.id,form:action.form||state.form,source:action.source||state.source,profile:action.profile||state.imageProfile,provider:action.provider||state.imageProvider,preferred:wikiPreference(),variant:wikiPreference(),visible_entries:state.records.map(x=>x.id),visible_sources:state.article?.mode==='search_results'?(state.article.results||[]).filter(row=>row.readable).map(row=>row.url):[]};}
function ensureRemoteOperation(entry){
 if(resourceUi.eventId&&resourceUi.entry===entry)return;
 resourceUi.entry=entry;resourceUi.eventId=resourceEventId();
 try{const row=JSON.parse(sessionStorage.getItem('atlas-resource-continuation')||'null');if(row?.version===state.version&&row.entry===entry){resourceUi.eventId=row.id;sessionStorage.removeItem('atlas-resource-continuation');}}catch{}
}
function persistRemoteContinuation(){try{sessionStorage.setItem('atlas-resource-continuation',JSON.stringify({version:state.version,entry:resourceUi.entry,id:resourceUi.eventId}));}catch{}}
function beginRemoteOperation(action){
 pausePrefetch();resourceUi.lastAt=Date.now();
 let kind=action.type;if(kind==='wikiLanguage')kind='language';if(kind==='readResult')kind='source';
 if(kind==='textMode'&&action.mode!=='original'&&['google','azure'].includes(state.prefs.translation_provider))kind='translate';
 else if(!remoteActions.has(kind))return;
 if(kind==='provider'&&!['commons','google','bing','baidu'].includes(action.provider))return;

 resourceUi.eventId=resourceEventId();resourceUi.entry=action.id||state.id;
 if(resourceUi.entry)post('/api/cache/operation',{id:resourceUi.eventId,kind,context:resourceContext(action)}).catch(()=>{});
 schedulePrefetch();
}
async function cachedResource(resource,refresh=false){
 try{const result=await post('/api/cache/lookup',{resource,event_id:resourceUi.eventId,track_only:!!refresh,protected_only:!!state.prefs.live_first});return result.hit?result.value:null;}catch{return null;}
}
function pausePrefetch(){
 const active=resourceUi.controller;active?.abort();resourceUi.controller=null;resourceUi.queue=[];
 if(active)post('/api/cache/cancel').catch(()=>{});
}
function schedulePrefetch(delay=1800){if(resourceUi.stopped)return;clearTimeout(resourceUi.timer);resourceUi.timer=setTimeout(prefetchStep,delay);}
async function prefetchStep(){
 if(resourceUi.stopped)return;
 if(state.immersive){schedulePrefetch(30000);return;}
 if(resourceUi.running||resourceUi.inflight||state.restoring||state.runtimePaused||state.prefs.prefetch_enabled===false||!state.id||!state.version||activePopup()||document.hidden||$('imageStatus').dataset.busy||state.article===null||Date.now()-resourceUi.lastAt<1600){schedulePrefetch(1800);return;}
 resourceUi.running=true;const controller=resourceUi.controller=new AbortController(),cap=setTimeout(()=>controller.abort(),26000);
 try{
  if(!resourceUi.queue.length){const plan=await api('/api/cache/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(resourceContext()),signal:controller.signal});resourceUi.queue=(plan.jobs||[]).map(job=>({...job,generation:plan.generation}));}
  const job=resourceUi.queue.shift();if(!job){schedulePrefetch(30000);return;}
  const result=await api('/api/cache/prefetch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(job),signal:controller.signal});
  if(!controller.signal.aborted&&result.browser_fallback)await browserPrefetch(job,controller.signal);
 }catch{}finally{clearTimeout(cap);if(resourceUi.controller===controller)resourceUi.controller=null;resourceUi.running=false;if(!resourceUi.timer||!resourceUi.stopped)schedulePrefetch(resourceUi.queue.length?650:3500);}
}
async function browserPrefetch(job,signal){
 const desc=job.resource,headers={'X-Atlas-Cache-Mode':job.tier,'X-Atlas-Prefetch-Generation':String(job.generation)};
 if(signal.aborted)return;
 if(desc.kind==='images'&&desc.provider==='commons'){
  const plan=await api('/api/browser-plan/images/'+encodeURIComponent(desc.entry)+'?'+new URLSearchParams({form:desc.form,profile:desc.profile}),{headers,signal}),pages=[];
  for(const params of plan.queries||[plan.params]){
   const response=await fetch(plan.url+'?'+new URLSearchParams(params),{signal,credentials:'omit'}),data=await response.json();if(!response.ok||data.error)throw new Error('Prefetch source unavailable');pages.push(...(data.query?.pages||[]));if(signal.aborted)return;
   const result=await api('/api/browser-ingest/images',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({entry_id:desc.entry,form:desc.form,profile:desc.profile,data:{query:{pages:[...new Map(pages.map(x=>[x.pageid||x.title,x])).values()]}}}),signal});
   if(result.images?.length)break;
  }
 }else if(desc.kind==='article'&&desc.source!=='auto'){
  const plan=await api('/api/browser-plan/article/'+encodeURIComponent(desc.entry)+'?'+new URLSearchParams({source:desc.source,variant:desc.variant}),{headers,signal});
  const response=await fetch(plan.url+'?'+new URLSearchParams(plan.params),{signal,credentials:'omit'}),data=await response.json();if(!response.ok||data.error||signal.aborted)return;
  await api('/api/browser-ingest/article',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({entry_id:desc.entry,source:desc.source,variant:desc.variant,data}),signal});
 }
}
function fillCacheSettings(){
 const p=state.prefs,keys=configuredShortcuts();for(const [id,key] of [['shortcutTreePrevious','tree_previous'],['shortcutTreeNext','tree_next'],['shortcutEntryPrevious','entry_previous'],['shortcutEntryNext','entry_next']])$(id).value=keys[key];
 $('prefetchEnabled').checked=p.prefetch_enabled!==false;
 for(const [id,key,fallback] of [['cacheWeightHistory','cache_weight_history',.2],['cacheWeightSession','cache_weight_session',.3],['cacheWeightRecent','cache_weight_recent',.5],['cacheSessionThreshold','cache_session_threshold',30],['cachePromoteHits','cache_promote_hits',6]])$(id).value=String(p[key]??fallback);
}
function collectCacheSettings(){return {shortcuts:{tree_previous:$('shortcutTreePrevious').value,tree_next:$('shortcutTreeNext').value,entry_previous:$('shortcutEntryPrevious').value,entry_next:$('shortcutEntryNext').value},prefetch_enabled:$('prefetchEnabled').checked,cache_weight_history:Number($('cacheWeightHistory').value),cache_weight_session:Number($('cacheWeightSession').value),cache_weight_recent:Number($('cacheWeightRecent').value),cache_session_threshold:Number($('cacheSessionThreshold').value),cache_promote_hits:Number($('cachePromoteHits').value)};}
async function loadCacheStats(){
 try{const data=await api('/api/cache/stats');$('cacheSummary').textContent=t('cacheSummary',{retained:data.retained_resources,memory:data.memory.records,mb:(data.memory.bytes/1048576).toFixed(2),session:data.session_total,weights:Object.values(data.effective_weights).map(x=>x.toFixed(2)).join(' / ')});
 $('cacheOperationRows').innerHTML=data.rows.map(row=>'<tr><td>'+esc(t('operation_'+row.kind))+'</td><td>'+row.history+'</td><td>'+row.session+'</td><td>'+row.recent+'</td><td>'+row.score.toFixed(3)+'</td></tr>').join('');
 $('cachePacketRows').innerHTML=data.packets.map(row=>'<tr><td>'+esc(row.resource.entry)+'<small> · '+esc(row.kind)+' '+esc(row.resource.source||row.resource.profile||'')+' · '+esc(t('cacheTier_'+(row.tier||'not_cached')))+'</small></td><td><code title="'+esc(row.fingerprint)+'">'+esc(row.fingerprint.slice(0,12))+'…</code></td><td>'+row.hits+'</td></tr>').join('');
 }catch(error){$('cacheSummary').textContent=errorMessage(error);}
}
function setupResourceCache(){
 const active=()=>{resourceUi.lastAt=Date.now();pausePrefetch();schedulePrefetch();};
 for(const type of ['pointerdown','keydown','input','wheel','change'])document.addEventListener(type,active,{passive:true});
 $('refreshCacheStats').addEventListener('click',loadCacheStats);$('clearMemoryCache').addEventListener('click',async()=>{await post('/api/cache/clear-memory');loadCacheStats();});
 window.addEventListener('pagehide',()=>{resourceUi.stopped=true;clearTimeout(resourceUi.timer);pausePrefetch();});schedulePrefetch(3000);
}
