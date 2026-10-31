"""Exercise actual release ZIP upgrades in temporary existing installations."""
import argparse,hashlib,json,os,subprocess,sys,tempfile,zipfile
from pathlib import Path

INITIALIZE=r'''
import json
from atlas.workspaces import workspaces
from atlas.catalogue import catalogue
from atlas.activity import activity
from atlas.preferences import preferences
from atlas.storage import Store
key=workspaces.active_id
workspaces.rename(key,'My retained collection')
preferences.save({'ui_language':'zh-Hant','reader_font_size':23,'lm_enabled':False})
activity.favorite('parsley',True,note='Retained favourite');activity.visit('parsley');activity.visit('parsley')
Store().put('upgrade-fixture',{'retained':'online packet'},ttl=100000)
folder=workspaces.directory();(folder/'media').mkdir(exist_ok=True);(folder/'media'/'keep.jpg').write_bytes(b'local-media-marker')
workspaces.create('Second collection','copy')
# A user edit must survive the subsequent audited field repair.
item=catalogue.get('gbif-5341387');item['name_zh']='My personal Hyssop label';item['aliases']=[*item.get('aliases',[]),'private naming alias'];catalogue.upsert(item)
print(json.dumps({'active':key,'versions':len(workspaces.list()['versions'])}))
'''
VERIFY=r'''
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from atlas.health import health
from atlas.preferences import preferences
from atlas.activity import activity
from atlas.storage import Store
from atlas.workspaces import workspaces
with patch.object(health,'start',lambda:None):
 with TestClient(app) as client:
  assert client.get('/api/status').json()['version']=='0.8.0'
  assert client.get('/api/catalog?limit=1').status_code==200
  assert client.get('/static/reading_v08.css').status_code==200
  assert client.get('/api/settings').json()['name_fonts']=={}
  assert client.get('/api/settings').json()['reader_font_family']==''
  assert client.get('/api/settings').json()['ui_language']=='zh-Hant'
  assert client.get('/api/entry/gbif-5341394').json()['name_zh']=='紫苏'
  assert client.get('/api/entry/gbif-2925649').json()['name_zh']=='柚木'
  assert client.get('/api/catalog?q=紫苏').json()['total']>0
  hyssop=client.get('/api/entry/gbif-5341387').json();assert hyssop['name_zh']=='My personal Hyssop label' and 'private naming alias' in hyssop['aliases']
assert preferences.values()['reader_font_size']==23
assert activity.collection('favorites')[0]['entry_id']=='parsley'
assert activity.collection('history')[0]['visits']==2
assert Store().get('upgrade-fixture')['value']=={'retained':'online packet'}
assert len(workspaces.list()['versions'])==2
assert (workspaces.directory()/'media/keep.jpg').read_bytes()==b'local-media-marker'
print(json.dumps({'new_app_started':True,'favorites':1,'history_visits':2,'workspaces':2,'ui_language':'zh-Hant','reader_size':23,'cache_packet_retained':True,'media_retained':True}))
'''
def extract(archive,parent):
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        roots={Path(name).parts[0] for name in z.namelist()};assert len(roots)==1
        for name in z.namelist():assert (parent/name).resolve().is_relative_to(parent.resolve())
        z.extractall(parent);return parent/roots.pop()
def hashes(target):
    paths=[p for folder in ['.venv','data/versions','data/version_trash','data/media'] for p in (target/folder).rglob('*') if p.is_file()]
    paths.extend(target/name for name in ['data/catalogue.sqlite3','data/catalogue.sqlite3.gz','data/cache.sqlite3','data/versions.json','data/version_manager.jsonl','config.local.json'] if (target/name).is_file())
    return {p.relative_to(target).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
def child(code,target,env):
    result=subprocess.run([sys.executable,'-c',code],cwd=target,env=env,capture_output=True,text=True,timeout=40)
    if result.returncode:raise RuntimeError(result.stderr[-3000:])
    return json.loads(result.stdout.strip().splitlines()[-1])
def case(base,source,label,parent):
    target=extract(base,parent/label);target_name=target.name
    env={k:v for k,v in os.environ.items() if not k.startswith(('SPICE_','LM_','GOOGLE_','AZURE_'))};env.update(PYTHONPATH=str(target),SPICE_DATA_DIR=str(target/'data'),PYTHONUTF8='1')
    setup=child(INITIALIZE,target,env);(target/'.venv').mkdir(exist_ok=True);(target/'.venv/keep-extra-package.txt').write_bytes(b'original-environment')
    before=hashes(target)
    dry=subprocess.run([sys.executable,str(source/'update.py'),'--target',str(target),'--dry-run'],capture_output=True,text=True,timeout=30);assert dry.returncode==0,dry.stderr
    assert hashes(target)==before
    run=subprocess.run([sys.executable,str(source/'update.py'),'--target',str(target)],capture_output=True,text=True,timeout=40);assert run.returncode==0,run.stderr+run.stdout[-2000:]
    for name,value in before.items():assert hashlib.sha256((target/name).read_bytes()).hexdigest()==value,name
    assert target.name==target_name and not (target/'data/update.lock').exists()
    state=json.loads((target/'data/install_state.json').read_text());assert state['version']=='0.8.0'
    verified=child(VERIFY,target,env)
    return {'case':label,'passed':True,'source_installation':str(base.name),'folder_name_retained':True,'protected_files_unchanged_before_first_start':len(before),'dry_run_read_only':True,'steps':state['steps'],'backup_present':(target/'data/updates'/state['transaction']/'journal.json').is_file(),'setup':setup,**verified}
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',type=Path,required=True);p.add_argument('--previous',type=Path,required=True);p.add_argument('--previous-review',type=Path);p.add_argument('--full',type=Path,required=True);p.add_argument('--patch',type=Path,required=True);p.add_argument('--report',type=Path,required=True);a=p.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-upgrade-') as td:
        parent=Path(td);full=extract(a.full,parent/'new-full');patch=extract(a.patch,parent/'new-patch')
        cases=[case(a.base,full,'v06-through-v07-to-v08-full-chain',parent),case(a.previous,patch,'v07-to-v08-small-patch',parent)]
        if a.previous_review:cases.append(case(a.previous_review,patch,'v08-review1-to-review2-same-version',parent))
        result={'passed':True,'cases':cases,'native_windows_tested':False,'external_health_probes':'disabled','restart_browser':'not opened in isolated tests','patch_sha256':hashlib.sha256(a.patch.read_bytes()).hexdigest(),'patch_bytes':a.patch.stat().st_size}
        a.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
