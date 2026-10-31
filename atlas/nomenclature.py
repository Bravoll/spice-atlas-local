"""Conservative, version-local nomenclature repair with an exact pre-change backup."""
from __future__ import annotations
import json,os,sqlite3,tempfile
from functools import lru_cache
from pathlib import Path
REVISION='names-20261031-v08-review2'
ASSET=Path(__file__).resolve().parents[1]/'data/research_curation/name_audit_v08/corrections.json'
@lru_cache(maxsize=1)
def bundle():return json.loads(ASSET.read_text('utf-8')) if ASSET.is_file() else None
def _revision(db):
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name='catalogue_meta'").fetchone():return None
    row=db.execute("SELECT value FROM catalogue_meta WHERE key='naming_revision'").fetchone()
    return json.loads(row[0]) if row else None
def apply(catalogue,db):
    if _revision(db)==REVISION:return True
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name='entries'").fetchone():return False
    data=bundle()
    if not data:return False
    current={r['id']:json.loads(r['payload']) for r in db.execute('SELECT id,payload FROM entries')}
    patches=[row for row in data['entries'] if row['id'] in current]
    if not patches:return False
    # Never replace another workspace's data, private files, favorites, or settings.
    backup_dir=catalogue.path.parent/'catalogue_backups';backup_dir.mkdir(exist_ok=True)
    backup=backup_dir/(REVISION+'.sqlite3')
    if not backup.exists():
        fd,name=tempfile.mkstemp(prefix='.naming-',suffix='.sqlite3',dir=backup_dir);os.close(fd)
        try:
            out=sqlite3.connect(name)
            try:db.backup(out)
            finally:out.close()
            os.replace(name,backup)
        finally:
            if Path(name).exists():Path(name).unlink()
    db.execute('BEGIN IMMEDIATE')
    if _revision(db)==REVISION:db.rollback();return True
    try:
        db.execute('CREATE TABLE IF NOT EXISTS nomenclature_changes(revision TEXT,entry_id TEXT,before_payload TEXT,after_payload TEXT,conflicts TEXT,PRIMARY KEY(revision,entry_id))')
        changed=0;skipped=[];eligible=set();members=[]
        for row in patches:
            # Reread after acquiring the write lock; a user or another process may have edited it.
            stored=db.execute('SELECT payload FROM entries WHERE id=?',(row['id'],)).fetchone();old=json.loads(stored[0]);new=dict(old);conflicts=[]
            if old.get('scientific','')!=row['scientific'] or str(old.get('source_key',''))!=row['source_key']:
                skipped.append({'id':row['id'],'reason':'scientific identity or source ID changed'});continue
            eligible.add(row['id'])
            for field,value in row['new'].items():
                before=row['old'].get(field);current_value=old.get(field)
                if current_value==before or current_value==value or (current_value in (None,'') and before in (None,'')):new[field]=value
                else:conflicts.append(field)
            new['aliases']=list(dict.fromkeys([*old.get('aliases',[]),*row.get('add_aliases',[])]))
            # A deliberately edited name keeps its user-owned provenance.
            if any(f in conflicts for f in ('name_zh','name_en')):
                new['name_provenance']={**old.get('name_provenance',{}),'revision':REVISION,'conflicts':conflicts,'checked_at':data['checked_at']}
                new['name_status']={lang:('custom' if 'name_'+lang in conflicts else row['new']['name_status'][lang]) for lang in ('zh','en')}
            if new!=old:
                catalogue.upsert(new,db=db,reindex=False);changed+=1
                db.execute('INSERT OR REPLACE INTO nomenclature_changes VALUES(?,?,?,?,?)',(REVISION,row['id'],json.dumps(old,ensure_ascii=False),json.dumps(new,ensure_ascii=False),json.dumps(conflicts)))
            if conflicts:skipped.append({'id':row['id'],'fields':conflicts})
            if row.get('membership') and not any(x in conflicts for x in ('family','genus')):members.append((row['membership'],row['id']))
        for row in data['nodes']:
            if row['old'] is None:
                if not eligible.intersection(row.get('required_by',[])):continue
                node=row['new'];db.execute('INSERT OR IGNORE INTO nodes VALUES(?,?,?,?,?,?,?)',tuple(node[k] for k in ('id','label_zh','label_en','kind','scope','source_url','payload')))
                db.execute('INSERT OR IGNORE INTO edges VALUES(?,?)',(row['parent'],row['id']));continue
            node=db.execute('SELECT * FROM nodes WHERE id=?',(row['id'],)).fetchone()
            if not node or node['kind']!=row['old']['kind'] or node['label_en']!=row['old']['label_en']:continue
            if node['label_zh'] not in (row['old']['label_zh'],row['new']['label_zh']):continue
            payload=json.loads(node['payload'] or '{}');payload['name_evidence']=row.get('evidence');payload['naming_revision']=REVISION
            db.execute('UPDATE nodes SET label_zh=?,payload=? WHERE id=?',(row['new']['label_zh'],json.dumps(payload,ensure_ascii=False),row['id']))
        db.executemany('INSERT OR IGNORE INTO membership VALUES(?,?)',members)
        if changed:
            db.execute('DELETE FROM entry_search');db.execute('INSERT INTO entry_search(entry_id,text) SELECT id,search_text FROM entries')
        for k,v in {'naming_revision':REVISION,'name_audit':data['summary'],'name_audit_local':{'changed':changed,'preserved_custom_fields':skipped,'backup':str(backup.relative_to(catalogue.path.parent))}}.items():
            db.execute('INSERT OR REPLACE INTO catalogue_meta VALUES(?,?)',(k,json.dumps(v,ensure_ascii=False)))
        db.commit();return True
    except BaseException:db.rollback();raise
