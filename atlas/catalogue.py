"""Persistent hierarchical catalogue, multilingual aliases and paged search."""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import sqlite3
import threading
import unicodedata
from pathlib import Path

from .storage import DATA, ROOT, now_iso
from .workspaces import workspaces, ClosingConnection
from .localization import to_hant, scientific_english
from opencc import OpenCC
_simplify=OpenCC("t2s")


def norm(text):
    return _simplify.convert(unicodedata.normalize("NFKC", str(text))).replace("_"," ").strip().casefold()


class Catalogue:
    def __init__(self, path=None, seed=True):
        self._path = Path(path) if path else None
        self.lock = threading.RLock()
        self._names_checked=set()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS entries(
                    id TEXT PRIMARY KEY,name_zh TEXT,name_en TEXT,scientific TEXT,family TEXT,
                    scope TEXT NOT NULL,review_state TEXT NOT NULL,source TEXT,source_key TEXT,
                    wikidata_id TEXT,wiki_zh TEXT,wiki_en TEXT,payload TEXT NOT NULL,search_text TEXT,
                    updated_at TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS entry_scope ON entries(scope,name_en,id);
                CREATE INDEX IF NOT EXISTS entry_wikidata ON entries(wikidata_id);
                CREATE INDEX IF NOT EXISTS entry_source ON entries(source,source_key);
                CREATE TABLE IF NOT EXISTS aliases(entry_id TEXT,language TEXT,value TEXT,normalized TEXT,
                    PRIMARY KEY(entry_id,language,normalized));
                CREATE INDEX IF NOT EXISTS alias_text ON aliases(normalized);
                CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY,label_zh TEXT,label_en TEXT,
                    kind TEXT,scope TEXT,source_url TEXT,payload TEXT);
                CREATE TABLE IF NOT EXISTS edges(parent_id TEXT,child_id TEXT,PRIMARY KEY(parent_id,child_id));
                CREATE TABLE IF NOT EXISTS membership(node_id TEXT,entry_id TEXT,PRIMARY KEY(node_id,entry_id));
                CREATE INDEX IF NOT EXISTS member_entry ON membership(entry_id);
                CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT,status TEXT,
                    progress INTEGER,total INTEGER,state TEXT,error TEXT,updated_at TEXT);
                CREATE TABLE IF NOT EXISTS quarantine(id TEXT PRIMARY KEY,status TEXT,reason TEXT,evidence TEXT,payload TEXT,original_scope TEXT,updated_at TEXT);
                CREATE TABLE IF NOT EXISTS catalogue_meta(key TEXT PRIMARY KEY,value TEXT);
                CREATE VIRTUAL TABLE IF NOT EXISTS entry_search USING fts5(entry_id UNINDEXED,text,tokenize='trigram');
            """)
        if seed:
            self.seed()

    @property
    def path(self):return self._path or workspaces.directory()/"catalogue.sqlite3"

    def connect(self):
        db = sqlite3.connect(self.path, timeout=30, factory=ClosingConnection)
        db.row_factory = sqlite3.Row
        signature=(str(self.path.resolve()),self.path.stat().st_ino)
        if signature not in self._names_checked:
            with self.lock:
                if signature not in self._names_checked:
                    from .nomenclature import apply
                    try:
                        if apply(self,db):self._names_checked.add(signature)
                    except BaseException:db.close();raise
        return db

    def seed(self):
        self.node("root-all","全部館藏","All records","root","all")
        self.node("root-culinary","香草与香辛料","Herbs & spices","root","culinary")
        self.node("root-botanical","植物分类参考库","Botanical reference","root","botanical")
        with self.connect() as db:
            db.executemany("INSERT OR IGNORE INTO edges VALUES(?,?)",[("root-all","root-culinary"),("root-all","root-botanical")])
        groups={"leaf":("叶与嫩梢","Leaves & shoots"),"seed":("籽实","Seeds & fruits"),"fruit":("果实","Fruits"),"bark":("树皮","Bark"),"flower":("花与花蕾","Flowers & buds")}
        for key,(zh,en) in groups.items():
            self.node("part-"+key,zh,en,"part","culinary",parent="root-culinary")
        data=json.loads((ROOT/"data/catalog.json").read_text("utf-8"))
        for item in data["entries"]:
            if not self.exists(item["id"]):
                self.upsert({**item,"name_zh":item["name"],"name_en":item["english"],"scope":"culinary","review_state":"curated","source":"editorial"})
            for group in item.get("groups",[item["group"]]):
                self.member("part-"+group,item["id"])

    def exists(self,key):
        with self.connect() as db:
            return db.execute("SELECT 1 FROM entries WHERE id=?",(key,)).fetchone() is not None

    def node(self,key,zh,en,kind,scope,source_url="",parent=None,payload=None,db=None):
        own=db is None
        db=db or self.connect()
        db.execute("INSERT INTO nodes VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label_zh=excluded.label_zh,label_en=excluded.label_en,source_url=excluded.source_url,payload=excluded.payload",(key,zh,en,kind,scope,source_url,json.dumps(payload or {},ensure_ascii=False)))
        if parent and parent!=key:
            db.execute("INSERT OR IGNORE INTO edges VALUES(?,?)",(parent,key))
        if own:
            db.commit();db.close()

    def member(self,node,key,db=None):
        own=db is None;db=db or self.connect()
        db.execute("INSERT OR IGNORE INTO membership VALUES(?,?)",(node,key))
        if own:db.commit();db.close()

    def upsert(self,item,db=None,reindex=True):
        own=db is None;db=db or self.connect()
        key=item["id"]
        old=db.execute("SELECT payload FROM entries WHERE id=?",(key,)).fetchone()
        data={**(json.loads(old[0]) if old else {}),**item}
        zh=data.get("name_zh") or "";en=(data.get('name_en') if 'name_en' in data else data.get('english')) or ''
        scientific=data.get("scientific","")
        wiki=data.get("wiki",{})
        aliases=list(dict.fromkeys([str(x).strip() for x in data.get("aliases",[]) if x and len(str(x))<180 and not re.search(r"https?://|<|>|[\x00-\x1f]",str(x))]));data["aliases"]=aliases
        text=norm(" ".join([zh,en,scientific,data.get("family",""),*aliases]))
        db.execute("""INSERT INTO entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            name_zh=excluded.name_zh,name_en=excluded.name_en,scientific=excluded.scientific,family=excluded.family,
            scope=excluded.scope,review_state=excluded.review_state,source=excluded.source,source_key=excluded.source_key,
            wikidata_id=excluded.wikidata_id,wiki_zh=excluded.wiki_zh,wiki_en=excluded.wiki_en,
            payload=excluded.payload,search_text=excluded.search_text,updated_at=excluded.updated_at""",
            (key,zh,en,scientific,data.get("family",""),data.get("scope","culinary"),data.get("review_state","candidate"),
             data.get("source",""),str(data.get("source_key","")),data.get("wikidata_id",""),wiki.get("zhwiki",""),wiki.get("enwiki",""),
             json.dumps(data,ensure_ascii=False),text,now_iso()))
        if reindex:
            db.execute("DELETE FROM entry_search WHERE entry_id=?",(key,))
            db.execute("INSERT INTO entry_search(entry_id,text) VALUES(?,?)",(key,text))
        db.execute("DELETE FROM aliases WHERE entry_id=?",(key,))
        for language,value in [("zh",zh),("en",en),("scientific",scientific),*[("alias",x) for x in aliases]]:
            if value:
                db.execute("INSERT OR IGNORE INTO aliases VALUES(?,?,?,?)",(key,language,value,norm(value)))
        if own:db.commit();db.close()
        return key

    def get(self,key):
        with self.connect() as db:
            row=db.execute("SELECT payload FROM entries WHERE id=?",(key,)).fetchone()
        return self.view(json.loads(row[0])) if row else None

    def view(self,data):
        zh=data.get("name_zh") or "";en=(data.get('name_en') if 'name_en' in data else data.get('english')) or ''
        data={**data,"name":zh or en or data.get("scientific",""),"english":en or data.get("scientific",""),"name_zh":zh,"name_en":en,
              "aliases":data.get("aliases",[]),"references":data.get("references",{}),"family":data.get("family",""),
              "wiki":data.get("wiki",{}),"intro":data.get("intro",""),"group":data.get("group","reference"),
              "groups":data.get("groups",[data.get("group","reference")])}
        if not data.get("forms"):
            query=data.get("scientific") or en or zh
            botanical=data.get("scope")=="botanical"
            data["forms"]=[{"id":"overview","name":"原植物" if botanical else "条目概览","name_en":"Plant overview" if botanical else "Record overview","part":"未核实烹饪部位","part_en":"Culinary use not verified","theme":"neutral","image_query":query,"commons_query":query}]
        data.setdefault("commons_query",data.get("scientific") or en or zh)
        data['scientific_en']=scientific_english(data.get('scientific',''))
        data.setdefault("baidu",zh or en or data.get("scientific",""))
        data["family_zh_hant"]=to_hant(data.get("family_zh",data.get("family","")))
        data["intro_hant"]=to_hant(data.get("intro",""))
        if data.get("facts"):data["facts_hant"]=[{**x,"label":to_hant(x["label"]),"text":to_hant(x["text"])} for x in data["facts"]]
        for key in ("name_zh","intro","family","scope_note"):
            data[key+"_hant"]=to_hant(data.get(key,""))
        data["name_hant"]=to_hant(data["name"])
        data["forms"]=[{**f,"name_hant":to_hant(f.get("name",""))} for f in data["forms"]]
        data.setdefault('name_status',{'zh':'available' if re.search(r'[\u3400-\u9fff]',zh) else 'missing','en':'available' if en and norm(en)!=norm(data.get('scientific','')) else 'missing'})
        return data

    def find_wiki(self,source,title):
        column="wiki_zh" if source=="zhwiki" else "wiki_en"
        with self.connect() as db:
            rows=db.execute(f"SELECT id,{column} AS title FROM entries WHERE {column}<>''").fetchall()
            # Candidate import uses indexed source keys when page IDs are known.
            for row in rows:
                if norm(row["title"])==norm(title):
                    return row["id"]
        return None

    def by_wikidata(self,qid):
        if not qid:return None
        with self.connect() as db:
            row=db.execute("SELECT id FROM entries WHERE wikidata_id=? ORDER BY CASE review_state WHEN 'curated' THEN 0 ELSE 1 END LIMIT 1",(qid,)).fetchone()
        return row[0] if row else None

    def random_entry(self,scope='culinary',exclude=''):
        """Uniform selection from local, admitted records; quarantine is never sampled."""
        import secrets
        clauses=[];params=[]
        if scope!='all':clauses.append('scope=?');params.append(scope)
        if exclude:clauses.append('id<>?');params.append(exclude)
        where=' AND '.join(clauses) or '1=1'
        with self.connect() as db:
            count=db.execute('SELECT COUNT(*) FROM entries WHERE '+where,params).fetchone()[0]
            if not count:return None
            row=db.execute('SELECT id FROM entries WHERE '+where+' ORDER BY id LIMIT 1 OFFSET ?',[*params,secrets.randbelow(count)]).fetchone()
        return {'id':row[0],'scope':scope,'eligible_count':count}

    def by_scientific(self,name,db=None):
        own=db is None;db=db or self.connect()
        row=db.execute("SELECT id FROM entries WHERE scientific=? COLLATE NOCASE ORDER BY CASE review_state WHEN 'curated' THEN 0 ELSE 1 END LIMIT 1",(name,)).fetchone()
        if own:db.close()
        return row[0] if row else None

    def children(self,parent,language="zh-Hans"):
        with self.connect() as db:
            rows=db.execute("""WITH RECURSIVE branch(root,id) AS (
                SELECT child_id,child_id FROM edges WHERE parent_id=?
                UNION SELECT b.root,e.child_id FROM branch b JOIN edges e ON e.parent_id=b.id
            ),counts AS (SELECT b.root,COUNT(DISTINCT m.entry_id) n FROM branch b JOIN membership m ON m.node_id=b.id JOIN entries x ON x.id=m.entry_id GROUP BY b.root)
            SELECT n.*,(SELECT COUNT(*) FROM edges WHERE parent_id=n.id) child_count,c.n entry_count
            FROM nodes n JOIN edges e ON e.child_id=n.id JOIN counts c ON c.root=n.id WHERE e.parent_id=?
            ORDER BY CASE n.kind WHEN 'part' THEN 0 ELSE 1 END,n.label_en""",(parent,parent)).fetchall()
        return [{**dict(r),"label_hant":to_hant(r["label_zh"] or r["label_en"]),"label":(r["label_zh"] or r["label_en"]) if language.startswith("zh") else (r["label_en"] or r["label_zh"]),'name_status':'available' if r['label_zh'] else 'scientific_only'} for r in rows]

    def page(self,q="",scope="all",node=None,offset=0,limit=30,group=None,collection="catalogue",history_order="recent"):
        q=norm(q);params=[];clauses=[]
        prefix=""
        if node:
            prefix="WITH RECURSIVE branch(id) AS (SELECT ? UNION SELECT edges.child_id FROM edges JOIN branch ON edges.parent_id=branch.id) "
            params.append(node)
            clauses.append("e.id IN (SELECT entry_id FROM membership JOIN branch ON node_id=branch.id)")
        if scope!="all":
            clauses.append("e.scope=?");params.append(scope)
        if group and group!="all":
            clauses.append("e.id IN (SELECT entry_id FROM membership WHERE node_id=?)");params.append("part-"+group)
        search_clause_index=len(clauses);search_param_index=len(params)
        if q:
            if len(q)>=3:
                clauses.append("e.id IN (SELECT entry_id FROM entry_search WHERE entry_search MATCH ?)")
                params.append('"'+q.replace('"','""')+'"')
            else:
                clauses.append("e.search_text LIKE ? ESCAPE '\\'")
                params.append("%"+q.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%")
        if collection in {"favorites","history"}:clauses.append("e.id IN (SELECT entry_id FROM saved."+collection+")")
        where=" AND ".join(clauses) or "1=1"
        ordering="CASE e.review_state WHEN 'curated' THEN 0 ELSE 1 END,COALESCE(NULLIF(e.name_en,''),e.scientific),e.id"
        with self.connect() as db:
            if collection in {"favorites","history"}:
                from .activity import activity
                with activity.connect():pass
                db.execute("ATTACH DATABASE ? AS saved",(str(workspaces.directory()/"activity.sqlite3"),))
                ordering="(SELECT "+("visited_at" if collection=="history" and history_order!="custom" else "position")+" FROM saved."+collection+" WHERE entry_id=e.id)"+(" DESC" if collection=="history" and history_order!="custom" else "")
            count=db.execute(prefix+"SELECT COUNT(*) FROM entries e WHERE "+where,params).fetchone()[0]
            rows=db.execute(prefix+"SELECT e.payload FROM entries e WHERE "+where+" ORDER BY "+ordering+" LIMIT ? OFFSET ?",[*params,limit,offset]).fetchall()
            if count==0 and len(q)>=4 and re.fullmatch(r"[a-z ]+",q):
                base=" AND ".join(clauses[:search_clause_index]+clauses[search_clause_index+1:]) or "1=1"
                fuzzy_params=params[:search_param_index]+params[search_param_index+1:]
                candidates=db.execute(prefix+"SELECT e.payload FROM entries e WHERE "+base+" AND e.search_text LIKE ? LIMIT 800",[*fuzzy_params,"%"+q[:2]+"%"]).fetchall()
                ranked=[]
                for row in candidates:
                    item=json.loads(row[0])
                    score=max((difflib.SequenceMatcher(None,q,norm(value)).ratio() for value in [item.get("name_en",""),item.get("scientific",""),*item.get("aliases",[])] if value),default=0)
                    if score>=0.68:ranked.append((score,item))
                ranked.sort(key=lambda x:(-x[0],x[1]["id"]))
                ranked=ranked[:40];count=len(ranked)
                return {"entries":[self.view(x[1]) for x in ranked[offset:offset+limit]],"total":count,"offset":offset,"limit":limit,"has_more":offset+limit<count,"stats":self.stats(),"search_mode":"fuzzy"}
        return {"entries":[self.view(json.loads(r[0])) for r in rows],"total":count,"offset":offset,"limit":limit,"has_more":offset+limit<count,"stats":self.stats(),"search_mode":"indexed"}

    def metadata(self,key,value=None):
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS catalogue_meta(key TEXT PRIMARY KEY,value TEXT)")
            if value is not None:db.execute("INSERT OR REPLACE INTO catalogue_meta VALUES(?,?)",(key,json.dumps(value,ensure_ascii=False)))
            row=db.execute("SELECT value FROM catalogue_meta WHERE key=?",(key,)).fetchone()
        return json.loads(row[0]) if row else None

    def quarantine(self,item,status,reason,evidence=None):
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS quarantine(id TEXT PRIMARY KEY,status TEXT,reason TEXT,evidence TEXT,payload TEXT,original_scope TEXT,updated_at TEXT)")
            db.execute("INSERT OR REPLACE INTO quarantine VALUES(?,?,?,?,?,?,?)",(item['id'],status,reason,json.dumps(evidence or {},ensure_ascii=False),json.dumps(item,ensure_ascii=False),item.get('scope',''),now_iso()))
            for table,col in [('entries','id'),('aliases','entry_id'),('entry_search','entry_id'),('membership','entry_id')]:db.execute('DELETE FROM '+table+' WHERE '+col+'=?',(item['id'],))

    def audit(self,offset=0,limit=50,status=''):
        with self.connect() as db:
            total=db.execute("SELECT COUNT(*) FROM quarantine WHERE (?='' OR status=?)",(status,status)).fetchone()[0]
            rows=db.execute("SELECT * FROM quarantine WHERE (?='' OR status=?) ORDER BY updated_at DESC,id LIMIT ? OFFSET ?",(status,status,min(100,limit),offset)).fetchall()
        return {'total':total,'rows':[{**dict(r),'evidence':json.loads(r['evidence']),'payload':json.loads(r['payload'])} for r in rows]}

    def stats(self):
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS quarantine(id TEXT PRIMARY KEY,status TEXT,reason TEXT,evidence TEXT,payload TEXT,original_scope TEXT,updated_at TEXT)")
            db.execute("CREATE TABLE IF NOT EXISTS catalogue_meta(key TEXT PRIMARY KEY,value TEXT)")
            rows=db.execute("SELECT scope,COUNT(*) AS n FROM entries GROUP BY scope").fetchall()
            nodes=db.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
            audit={r[0]:r[1] for r in db.execute('SELECT status,COUNT(*) FROM quarantine GROUP BY status')}
            metadata={r[0]:json.loads(r[1]) for r in db.execute('SELECT * FROM catalogue_meta')}
        return {"culinary":next((r["n"] for r in rows if r["scope"]=="culinary"),0),"botanical":next((r["n"] for r in rows if r["scope"]=="botanical"),0),"nodes":nodes,"total":sum(r["n"] for r in rows),'audit':audit,'metadata':metadata}

    def related(self,item,limit=8):
        if not item.get("family"):return []
        with self.connect() as db:
            rows=db.execute("SELECT id,name_zh,name_en,scientific,scope FROM entries WHERE family=? AND id<>? ORDER BY CASE review_state WHEN 'curated' THEN 0 ELSE 1 END,COALESCE(NULLIF(name_en,''),scientific) LIMIT ?",(item["family"],item["id"],limit)).fetchall()
        return [{**dict(r),"name_hant":to_hant(r["name_zh"] or r["name_en"] or r['scientific']),"name":r["name_zh"] or r["name_en"] or r['scientific'],"english":r["name_en"] or r['scientific'],"reason":"同科 / Same family: "+item["family"]} for r in rows]


catalogue=Catalogue()
