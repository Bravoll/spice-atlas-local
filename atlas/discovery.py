"""Resumable metadata discovery from Wikimedia categories and GBIF taxonomy."""
from __future__ import annotations

import asyncio
import json
import re
import uuid
from urllib.parse import quote

from .catalogue import catalogue, norm
from .network import SourceFailure, fetch_json
from .storage import now_iso
from .workspaces import workspaces
from .activity import activity

WIKIS={"enwiki":"https://en.wikipedia.org","zhwiki":"https://zh.wikipedia.org"}
WIKI_ROOTS={
    "en-spices":("enwiki","Category:Spices","香辛料 · 英文分类","Spices · English categories"),
    "en-herbs":("enwiki","Category:Herbs","香草 · 英文分类","Herbs · English categories"),
    "zh-spices":("zhwiki","Category:香料","香料 · 中文分类","Spices · Chinese categories"),
    "zh-herbs":("zhwiki","Category:香草","香草 · 中文分类","Herbs · Chinese categories"),
}
GBIF_FAMILIES={"Lamiaceae":{"key":2497,"zh":"唇形科"},"Apiaceae":{"key":6720,"zh":"伞形科"},"Piperaceae":{"key":6678,"zh":"胡椒科"}}
BACKBONE="d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"


async def enrich_labels(ids):
    ids=list(dict.fromkeys(x for x in ids if x and re.fullmatch(r"Q\d+",x)))
    output={}
    for start in range(0,len(ids),40):
        chunk=ids[start:start+40]
        data=await fetch_json("https://www.wikidata.org/w/api.php",{"action":"wbgetentities","ids":"|".join(chunk),"props":"labels|aliases|sitelinks|claims|descriptions","languages":"zh|zh-hans|zh-cn|en","sitefilter":"zhwiki|enwiki","format":"json"})
        output.update(data.get("entities",{}))
    return output


def apply_labels(item,entity):
    names=[x.get('mainsnak',{}).get('datavalue',{}).get('value') for x in entity.get('claims',{}).get('P225',[])]
    if item.get('scientific') and names and not any(isinstance(x,str) and norm(x)==norm(item['scientific']) for x in names):
        item['label_resolution_note']='Scientific identity mismatch; labels not transferred'
        return item
    labels=entity.get("labels",{});aliases=entity.get("aliases",{})
    zh=next((labels[k]["value"] for k in ["zh-hans","zh-cn","zh"] if k in labels),"")
    en=labels.get("en",{}).get("value","")
    extra=[x["value"] for lang in ["zh","zh-hans","zh-cn","en"] for x in aliases.get(lang,[])]
    protected=item.get('review_state')=='curated' or item.get('name_provenance',{}).get('revision')
    if zh and not protected:item["name_zh"]=zh
    if en and not protected:item["name_en"]=en
    item["aliases"]=list(dict.fromkeys([*item.get("aliases",[]),*extra]))
    item["wiki"]={**item.get("wiki",{}),**{site:link["title"] for site,link in entity.get("sitelinks",{}).items() if site in WIKIS}}
    item["wikidata_id"]=entity.get("id",item.get("wikidata_id",""))
    claims=entity.get("claims",{})
    def first_value(key):
        return next((c.get("mainsnak",{}).get("datavalue",{}).get("value") for c in claims.get(key,[]) if c.get("mainsnak",{}).get("datavalue")),None)
    item["entity_types"]=[v.get("mainsnak",{}).get("datavalue",{}).get("value",{}).get("id") for v in claims.get("P31",[]) if isinstance(v.get("mainsnak",{}).get("datavalue",{}).get("value"),dict)]
    item["entity_descriptions"]={k:v.get("value","") for k,v in entity.get("descriptions",{}).items()}
    scientific=first_value("P225");image=first_value("P18")
    if isinstance(scientific,str) and not item.get("scientific"):item["scientific"]=scientific
    if isinstance(image,str):item["primary_image"]=image
    return item


async def import_wiki_members(source,members,node_id):
    articles=[m for m in members if m.get("ns")==0]
    if not articles:return 0
    data=await fetch_json(WIKIS[source]+"/w/api.php",{"action":"query","pageids":"|".join(str(x["pageid"]) for x in articles),"prop":"pageprops|langlinks","lllimit":500,"format":"json","formatversion":2})
    pages=data.get("query",{}).get("pages",[])
    qids=[x.get("pageprops",{}).get("wikibase_item") for x in pages]
    try:entities=await enrich_labels(qids)
    except SourceFailure:entities={}
    count=0
    for page in pages:
        qid=page.get("pageprops",{}).get("wikibase_item","")
        entity=entities.get(qid,{})
        wiki={source:page["title"]}
        for x in page.get("langlinks",[]):
            if x.get("lang") in {"zh","en"}:
                wiki["zhwiki" if x["lang"]=="zh" else "enwiki"]=x.get("title",x.get("*",""))
        existing=catalogue.by_wikidata(qid) or catalogue.find_wiki(source,page["title"])
        if not existing:
            for other,title in wiki.items():
                existing=catalogue.find_wiki(other,title)
                if existing:break
        key=existing or ("wd-"+qid if qid else f"wiki-{source}-{page['pageid']}")
        old=catalogue.get(key) or {}
        item={**old,"id":key,"name_zh":old.get("name_zh") or wiki.get("zhwiki",""),"name_en":old.get("name_en") or wiki.get("enwiki",page["title"]),
              "wiki":{**old.get("wiki",{}),**wiki},"scope":"culinary","review_state":old.get("review_state","candidate"),
              "source":old.get("source") or source,"source_key":str(page["pageid"]),"wikidata_id":qid,
              "scope_note":old.get("scope_note") or "由维基分类目录发现的候选条目，分类成员可能包含文化、混合物或非食用内容，尚未逐项核实烹饪用途。"}
        if entity:apply_labels(item,entity)
        from .curation import admit
        decision=admit(item,entity)
        if decision["status"] in {"excluded","pending"}:
            catalogue.quarantine(item,decision["status"],decision["reason"],decision);continue
        item.update(scope=decision["scope"],review_state=old.get("review_state") if old.get("review_state")=="curated" else decision["review_state"])
        catalogue.upsert(item);catalogue.member(node_id,key);count+=1
    catalogue.metadata("last_sync_at",now_iso())
    return count


async def resolve_entry(key,force=False):
    item=catalogue.get(key)
    if not item:raise SourceFailure("Entry not found",code="not_found")
    if item.get("sources_resolved") and not force:return item
    if item.get("review_state")=="curated" and item.get("wiki",{}).get("zhwiki") and item.get("wiki",{}).get("enwiki") and not force:
        return item
    wiki=item.get("wiki",{})
    source="enwiki" if wiki.get("enwiki") or not wiki.get("zhwiki") else "zhwiki"
    title=wiki.get(source) or item.get("scientific") or item.get("name_en") or item["name"]
    try:
        data=await fetch_json(WIKIS[source]+"/w/api.php",{"action":"query","titles":title,"redirects":1,"prop":"pageprops|langlinks","lllimit":500,"format":"json","formatversion":2})
        page=next(iter(data.get("query",{}).get("pages",[])),{})
        if page.get("missing") or not page.get("pageid"):
            item["sources_resolved"]=True;item["wiki"]={k:v for k,v in wiki.items() if k!=source}
            catalogue.upsert(item);return catalogue.get(key)
        wiki[source]=page["title"]
        for link in page.get("langlinks",[]):
            if link.get("lang") in {"zh","en"}:
                wiki["zhwiki" if link["lang"]=="zh" else "enwiki"]=link.get("title",link.get("*",""))
        qid=page.get("pageprops",{}).get("wikibase_item")
        if qid:
            try:
                entities=await enrich_labels([qid]);apply_labels(item,entities.get(qid,{}))
            except SourceFailure:
                item["wikidata_id"]=qid
        item["wiki"]={**item.get("wiki",{}),**wiki};item["sources_resolved"]=True
        catalogue.upsert(item)
    except SourceFailure as exc:
        # A failed connection is not evidence that a page is absent.
        item["resolution_error"]=exc.public()
    return item


class Jobs:
    def __init__(self):
        self.tasks={}

    def save(self,job):
        with catalogue.connect() as db:
            db.execute("INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?,?,?,?)",
                       (job["id"],job["kind"],job["status"],job.get("progress",0),job.get("total",0),
                        json.dumps(job["state"],ensure_ascii=False),job.get("error",""),now_iso()))

    def get(self,key):
        with catalogue.connect() as db:
            row=db.execute("SELECT * FROM jobs WHERE id=?",(key,)).fetchone()
        if not row:return None
        obj=dict(row);obj["state"]=json.loads(obj["state"]);return obj

    def public(self,job):
        if not job:return None
        state=job["state"]
        return {k:v for k,v in job.items() if k!="state"}|{"pending_categories":len(state.get("queue",[])),
                "families":state.get("families",[]),"current":state.get("current",""),"scope":state.get("scope","culinary")}

    def list(self):
        with catalogue.connect() as db:
            rows=db.execute("SELECT id FROM jobs ORDER BY updated_at DESC LIMIT 30").fetchall()
        return [self.public(self.get(r[0])) for r in rows]

    def create(self,kind,options):
        if kind=="wiki":
            roots=options.get("roots",["en-spices","en-herbs","zh-spices","zh-herbs"])
            if not roots or any(x not in WIKI_ROOTS for x in roots):raise ValueError("Unknown category root")
            depth=max(0,min(int(options.get("max_depth",2)),6))
            queue=[]
            for root in roots:
                source,title,zh,en=WIKI_ROOTS[root]
                node="wiki-cat-"+root
                catalogue.node(node,zh,en,"category","culinary",WIKIS[source]+"/wiki/"+quote(title),parent="root-culinary",payload={"source":source,"category":title})
                queue.append({"source":source,"title":title,"node":node,"depth":0})
            state={"scope":"culinary","queue":queue,"visited":[],"max_depth":depth,"max_categories":max(4,min(int(options.get("max_categories",200)),2000)),"categories_done":0}
        elif kind=="gbif":
            families=options.get("families",list(GBIF_FAMILIES))
            if not families or any(x not in GBIF_FAMILIES for x in families):raise ValueError("Unknown plant family")
            state={"scope":"botanical","families":families,"family_index":0,"offset":0,"dataset_key":BACKBONE}
        else:raise ValueError("Unknown import kind")
        job={"id":uuid.uuid4().hex,"kind":kind,"status":"queued","progress":0,"total":0,"state":state,"error":""}
        self.save(job);activity.log("import.create",{"job_id":job["id"],"kind":kind,"options":options});return job

    def start(self,job):
        key=(workspaces.current_id,job["id"])
        if key in self.tasks and not self.tasks[key].done():return
        self.tasks[key]=asyncio.create_task(self.run(job["id"]))

    async def pause(self,key):
        task=self.tasks.get((workspaces.current_id,key))
        if task and not task.done():
            task.cancel()
            try:await task
            except asyncio.CancelledError:pass
        else:
            job=self.get(key)
            if job and job["status"] not in {"completed"}:
                job["status"]="paused";self.save(job)

    async def pause_all(self,version=None):
        version=version or workspaces.current_id
        with workspaces.use(version):
            for job in self.list():
                if job["status"] in {"queued","running"}:await self.pause(job["id"])

    async def run(self,key):
        job=self.get(key)
        if not job:return
        job["status"]="running";job["error"]="";self.save(job);activity.log("import.start",{"job_id":key,"kind":job["kind"],"progress":job["progress"]})
        try:
            if job["kind"]=="wiki":await self.run_wiki(job)
            else:await self.run_gbif(job)
            job["status"]="completed"
        except asyncio.CancelledError:
            job["status"]="paused";self.save(job);activity.log("import.pause",{"job_id":key,"progress":job["progress"]});raise
        except Exception as exc:
            job["status"]="paused";job["error"]=str(exc)
        self.save(job);activity.log("import."+job["status"],{"job_id":key,"progress":job["progress"],"error":job.get("error","")})

    async def run_wiki(self,job):
        state=job["state"]
        while state["queue"]:
            current=state["queue"][0];state["current"]=current["title"]
            marker=current["source"]+"|"+current["title"]
            if marker in state["visited"]:
                state["queue"].pop(0);continue
            params={"action":"query","list":"categorymembers","cmtitle":current["title"],"cmtype":"page|subcat","cmlimit":50,"format":"json","formatversion":2}
            if current.get("continue"):params["cmcontinue"]=current["continue"]
            data=await fetch_json(WIKIS[current["source"]]+"/w/api.php",params)
            members=data.get("query",{}).get("categorymembers",[])
            job["progress"]+=await import_wiki_members(current["source"],members,current["node"])
            for member in members:
                if member["ns"]!=14 or current["depth"]>=state["max_depth"]:continue
                node="wiki-cat-"+current["source"]+"-"+str(member["pageid"])
                title=member["title"]
                label=title.partition(":")[2]
                catalogue.node(node,label if current["source"]=="zhwiki" else "",label,"category","culinary",WIKIS[current["source"]]+"/wiki/"+quote(title),parent=current["node"],payload={"source":current["source"],"category":title})
                sub_marker=current["source"]+"|"+title
                if sub_marker not in state["visited"] and not any(x["source"]==current["source"] and x["title"]==title for x in state["queue"]):
                    state["queue"].append({"source":current["source"],"title":title,"node":node,"depth":current["depth"]+1})
            continuation=data.get("continue",{}).get("cmcontinue")
            if continuation:current["continue"]=continuation
            else:
                state["visited"].append(marker);state["queue"].pop(0);state["categories_done"]+=1
            self.save(job);activity.log("import.page",{"job_id":job["id"],"category":current["title"],"categories_done":state["categories_done"],"progress":job["progress"],"continuation_saved":bool(continuation)})
            if state["categories_done"]>=state["max_categories"] and state["queue"]:
                raise RuntimeError("已到达本次分类数量上限；提高上限后可继续，已保存进度。")

    async def run_gbif(self,job):
        state=job["state"]
        while state["family_index"]<len(state["families"]):
            name=state["families"][state["family_index"]];family=GBIF_FAMILIES[name]
            state["current"]=name
            url="https://www.gbif.org/species/"+str(family["key"])
            family_node="gbif-family-"+str(family["key"])
            catalogue.node(family_node,family["zh"],name,"family","botanical",url,parent="root-botanical",payload={"gbif_key":family["key"]})
            data=await fetch_json("https://api.gbif.org/v1/species/search",{"datasetKey":BACKBONE,"highertaxonKey":family["key"],"rank":"SPECIES","status":"ACCEPTED","limit":1000,"offset":state["offset"]},timeout=60)
            results=data.get("results",[])
            with catalogue.connect() as db:
                for record in results:
                    if record.get("rank")!="SPECIES" or record.get("taxonomicStatus")!="ACCEPTED":continue
                    key="gbif-"+str(record["key"]);scientific=record.get("canonicalName") or record["scientificName"]
                    genus=record.get("genus","");genus_key=record.get("genusKey") or norm(genus)
                    genus_node="gbif-genus-"+str(genus_key)
                    catalogue.node(genus_node,"",genus,"genus","botanical","https://www.gbif.org/species/"+str(genus_key),parent=family_node,db=db)
                    vernacular=record.get("vernacularNames") or []
                    zh=next((x.get("vernacularName","") for x in vernacular if x.get("language") in {"zho","chi","zh"} and re.search(r'[\u3400-\u9fff]',x.get('vernacularName',''))),"")
                    en=next((x.get("vernacularName","") for x in vernacular if x.get("language") in {"eng","en"} and norm(x.get('vernacularName',''))!=norm(scientific)),"")
                    aliases=[record.get("scientificName",""),*[x.get("vernacularName","") for x in vernacular]]
                    item={"id":key,"name_zh":zh,"name_en":en,"scientific":scientific,"family":name,"genus":genus,
                          "scope":"botanical","review_state":"reference_only","source":"gbif","source_key":str(record["key"]),
                          "aliases":aliases,"wiki":{},"gbif_key":record["key"],"dataset_key":BACKBONE,
                          "scope_note":"植物分类参考记录，未核实食用或调味用途。 / Botanical reference; culinary use is not verified.",
                          "references":{"gbif":{"name":"GBIF 植物分类 / GBIF taxonomy","url":"https://www.gbif.org/species/"+str(record["key"]),"summary":scientific+" · "+name+". 分类记录不代表食用用途已经确认。","checked_at":now_iso()}},
                          "taxonomy_provenance":{"url":"https://api.gbif.org/v1/species/"+str(record["key"]),"dataset_key":BACKBONE,"fetched_at":now_iso()}}
                    existing=catalogue.by_scientific(scientific,db)
                    if existing:
                        previous=db.execute('SELECT payload FROM entries WHERE id=?',(existing,)).fetchone()
                        old=json.loads(previous[0]);key=existing
                        if old.get('review_state')=='curated':item={**old,'references':{**old.get('references',{}),**item['references']}}
                        else:
                            item={**old,**item,'id':key}
                            if old.get('name_provenance'):
                                for field in ('name_zh','name_en','name_status','name_provenance','family_zh'):item[field]=old.get(field)
                                item['aliases']=list(dict.fromkeys([*old.get('aliases',[]),*item.get('aliases',[])]))
                    catalogue.upsert(item,db=db);catalogue.member(genus_node,key,db=db)
            job["progress"]+=len(results)
            if state["offset"]==0:job["total"]+=int(data.get("count",len(results)))
            state["offset"]+=len(results)
            if data.get("endOfRecords") or not results or state["offset"]>=int(data.get("count",state["offset"]+1)):
                state["family_index"]+=1;state["offset"]=0
            catalogue.metadata("last_sync_at",now_iso())
            self.save(job);activity.log("import.page",{"job_id":job["id"],"family":name,"offset":state["offset"],"progress":job["progress"]})


jobs=Jobs()
