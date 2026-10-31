"""In-place, manifest-driven updates. Standard library only; never import the running app."""
from __future__ import annotations
import argparse, collections, ctypes, hashlib, json, os, shutil, subprocess, sys, time, tomllib, urllib.request, uuid
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

APP_ID='spice-atlas-local'
ROOT_FILES={'AGENTS.md','main.py','launch.py','Start_Atlas.pyw','update.py','Update_Atlas.cmd','Update_Atlas.sh','run.cmd','run_console.cmd','run.sh','README.md','README.en.md','README.zh-CN.md','CHANGELOG.md','CHANGELOG.zh-CN.md','development.md','CONTENT_LICENSES.md','CONTENT_LICENSES.zh-CN.md','config.example.json','pyproject.toml','uv.lock','requirements.txt','package.json','package-lock.json','.gitignore','.gitattributes'}
ROOT_FILES.update({'LICENSE','LICENSE.zh-CN.md'})
ROOT_DIRS={'atlas','desktop','static','scripts','tests','docs','browser_helper'}
DATA_DIRS={'source_research','research_curation'}
DATA_FILES={'other_sources.json','verification_v07.json','verification_v08.json','catalogue_seed.json','catalogue_manifest.json','image_vocabulary.json','source_policy.json'}
MIGRATIONS={'preserve-workspaces-v1'}

class UpdateError(Exception):pass
def now():return datetime.now(timezone.utc).isoformat(timespec='seconds')
def digest(data):return hashlib.sha256(data).hexdigest()
def canonical(data):return data.replace(b'\r\n',b'\n')
def safe_relative(value):
    if not isinstance(value,str) or not value or '\\' in value or ':' in value:raise UpdateError('Invalid update path')
    p=PurePosixPath(value)
    if p.is_absolute() or any(x in {'','.','..'} for x in value.split('/')):raise UpdateError('Unsafe update path: '+value)
    for part in p.parts:
        if part.endswith((' ','.')) or part.split('.')[0].upper() in {'CON','PRN','AUX','NUL',*(f'COM{i}' for i in range(1,10)),*(f'LPT{i}' for i in range(1,10))}:raise UpdateError('Unsupported update filename')
    return p
def managed_path(value):
    p=safe_relative(value)
    if any(x in {'.git','.venv','__pycache__','node_modules','config.local.json','versions','version_trash','launcher','media','updates','install_state.json','update_history.jsonl'} or x.startswith('.env') for x in p.parts) or any(x in value for x in ['.sqlite3','.sqlite','-wal','-shm']):raise UpdateError('Protected local resource: '+value)
    allowed=len(p.parts)==1 and value in ROOT_FILES or p.parts[0] in ROOT_DIRS or p.parts[0]=='data' and (len(p.parts)==2 and p.name in DATA_FILES or len(p.parts)>2 and p.parts[1] in DATA_DIRS)
    if not allowed:raise UpdateError('Path is outside managed application files: '+value)
    return p
def checked_path(root,relative):
    p=root.joinpath(*safe_relative(relative).parts)
    for item in [p,*list(p.parents)[:len(p.relative_to(root).parts)-1]]:
        if item.is_symlink() or getattr(item.lstat() if item.exists() else None,'st_file_attributes',0)&0x400:raise UpdateError('Symlink or junction in update path: '+relative)
    if not p.resolve().is_relative_to(root.resolve()):raise UpdateError('Path escapes selected directory')
    return p
def write_atomic(path,data):
    path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_name(path.name+'.atlas-update-'+uuid.uuid4().hex)
    try:
        with temporary.open('wb') as out:out.write(data);out.flush();os.fsync(out.fileno())
        os.replace(temporary,path)
    finally:temporary.unlink(missing_ok=True)
def version_of(target):
    try:
        project=tomllib.loads((target/'pyproject.toml').read_text('utf-8'))['project']
        if not str(project['name']).startswith(APP_ID) or not (target/'main.py').is_file():raise ValueError()
        return project['version']
    except (OSError,ValueError,KeyError):raise UpdateError('Select the existing Spice Atlas folder containing main.py and pyproject.toml') from None
def chain_for(manifest,installed):
    desired=manifest['target_version'];steps=manifest['steps']
    if installed==desired:
        same=[s for s in steps if installed in s['from_versions'] and s['to_version']==desired]
        if same:return [same[-1]]
    queue=collections.deque([(installed,[])]);seen={installed}
    while queue:
        current,path=queue.popleft()
        for step in steps:
            if current not in step['from_versions']:continue
            after=step['to_version'];route=path+[step]
            if after==desired:return route
            if after not in seen:seen.add(after);queue.append((after,route))
    raise UpdateError('No complete upgrade chain from '+installed+' to '+desired)
def ensure_stopped(target):
    key=hashlib.sha256(os.path.normcase(str(target.resolve())).encode('utf-8')).hexdigest()[:24]
    ports=set(range(8765,8795));session=target/'data/launcher/session.json'
    try:ports.add(int(json.loads(session.read_text())['port']))
    except (OSError,ValueError,KeyError,TypeError):pass
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for port in sorted(p for p in ports if 0<p<65536):
        try:
            with opener.open(f'http://127.0.0.1:{port}/api/status',timeout=.15) as response:value=json.load(response)
            if value.get('app_id')==APP_ID and value.get('project_key')==key:raise UpdateError('Close Spice Atlas with Stop service and exit in the tray before updating.')
        except (OSError,ValueError):pass
    if os.name=='nt':
        # The old launcher can remain open after its server stops; it owns this mutex.
        from ctypes import wintypes
        kernel=ctypes.WinDLL('kernel32',use_last_error=True);kernel.OpenMutexW.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.LPCWSTR];kernel.OpenMutexW.restype=wintypes.HANDLE
        kernel.CloseHandle.argtypes=[wintypes.HANDLE]
        for name in ['Local\\SpiceAtlas_'+key]:
            handle=kernel.OpenMutexW(0x100000,False,name)
            if handle:kernel.CloseHandle(handle);raise UpdateError('Exit the existing Spice Atlas launcher before updating.')
def plan_update(source,target):
    source=Path(source).resolve();target=Path(target).resolve();installed=version_of(target)
    try:manifest=json.loads((source/'update_manifest.json').read_text('utf-8'))
    except (OSError,ValueError):raise UpdateError('The new folder has no readable update_manifest.json') from None
    if manifest.get('format')!=1 or manifest.get('app_id')!=APP_ID:raise UpdateError('Unsupported update manifest')
    if not isinstance(manifest.get('steps'),list) or len(manifest['steps'])>30 or len({s['id'] for s in manifest['steps']})!=len(manifest['steps']):raise UpdateError('Invalid or duplicate migration steps')
    steps=chain_for(manifest,installed);virtual={};operations=[];count=0
    for step in steps:
        if step.get('migration') not in MIGRATIONS:raise UpdateError('Unknown migration: '+str(step.get('migration')))
        for row in step['files']:
            relative=row['path'];managed_path(relative);destination=checked_path(target,relative)
            if destination.exists() and not destination.is_file():raise UpdateError('Expected a file: '+relative)
            before=virtual.get(relative,destination.read_bytes() if destination.exists() else None)
            if row.get('delete'):
                after=None
            else:
                payload=checked_path(source,row['source']);size=payload.stat().st_size;count+=size
                if size>32_000_000 or count>100_000_000:raise UpdateError('Update payload exceeds size budget')
                after=payload.read_bytes()
                if digest(after)!=row['sha256']:raise UpdateError('Update payload checksum failed: '+relative)
            already=before is not None and after is not None and canonical(before)==canonical(after)
            if not already and (before is None and not row.get('before_missing') or before is not None and digest(canonical(before)) not in row.get('before_sha256',[])):
                raise UpdateError('Local application file differs from supported releases: '+relative+'. Back up your changes before updating.')
            virtual[relative]=after
            if before!=after:operations.append({'path':relative,'data':after,'step':step['id']})
    return {'manifest':manifest,'installed':installed,'steps':steps,'operations':operations,'target':target,'source':source}
def sync_dependencies(target,log_path):
    uv=shutil.which('uv');python=target/('.venv/Scripts/python.exe' if os.name=='nt' else '.venv/bin/python')
    if not python.exists():return # First launch will create the environment.
    command=[uv,'sync','--frozen','--inexact'] if uv else [str(python),'-m','pip','install','-r','requirements.txt']
    result=subprocess.run(command,cwd=target,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    write_atomic(log_path,result.stdout.encode('utf-8'))
    if result.returncode:raise UpdateError('Dependency reconciliation failed; application and environment will be restored. See the dependency log in the update backup.')
    return result.stdout
def apply_update(source,target,*,dry_run=False,emit=print,hook=None):
    plan=plan_update(source,target);target=plan['target'];steps=plan['steps'];operations=plan['operations']
    emit('Upgrade '+plan['installed']+' → '+plan['manifest']['target_version']+' · '+str(len(operations))+' file operations')
    if dry_run:
        for op in operations:emit(op['step']+' · '+('remove ' if op['data'] is None else 'replace ')+op['path'])
        return {'dry_run':True,'steps':[s['id'] for s in steps],'files':len(operations)}
    ensure_stopped(target);data=checked_path(target,'data');data.mkdir(exist_ok=True);checked_path(target,'data/updates');lock=data/'update.lock'
    try:fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    except FileExistsError:raise UpdateError('Another update may be running (data/update.lock). Check the previous updater before removing a stale lock.') from None
    os.write(fd,str(os.getpid()).encode());os.close(fd);transaction=now().replace(':','').replace('+','-')+'-'+uuid.uuid4().hex[:8];backup=data/'updates'/transaction
    old={};venv_backup=False;begun=False
    def record(kind,**details):
        with (backup/'events.jsonl').open('a',encoding='utf-8') as out:out.write(json.dumps({'at':now(),'event':kind,**details},ensure_ascii=False)+'\n')
    try:
        if version_of(target)!=plan['installed']:raise UpdateError('Installed version changed during preparation; run the updater again')
        backup.mkdir(parents=True);paths=list(dict.fromkeys(op['path'] for op in operations))+['data/install_state.json']
        for name in paths:
            path=checked_path(target,name);old[name]=path.read_bytes() if path.exists() else None
            if old[name] is not None:write_atomic(backup/'files'/name,old[name])
        write_atomic(backup/'journal.json',json.dumps({'before_version':plan['installed'],'target_version':plan['manifest']['target_version'],'paths':{name:value is not None for name,value in old.items()}},indent=2).encode())
        needs_deps=any(s.get('dependencies_changed') for s in steps)
        if needs_deps and (target/'.venv').exists():
            if (target/'.venv').is_symlink():raise UpdateError('External dependency environments need a separate backup before upgrading dependencies')
            emit('Backing up existing dependency environment');shutil.copytree(target/'.venv',backup/'venv',symlinks=True);venv_backup=True
        begun=True
        for step in steps:
            emit('Applying '+step['id']);record('step.start',step=step['id'])
            for op in [x for x in operations if x['step']==step['id']]:
                path=checked_path(target,op['path'])
                if op['data'] is None:path.unlink(missing_ok=True)
                else:write_atomic(path,op['data'])
                record('file.replace',step=step['id'],path=op['path'])
                if hook:hook(step['id'],op['path'])
            record('migration.complete',step=step['id'],migration=step['migration'])
        if needs_deps:
            sync_dependencies(target,backup/'dependencies.log')
        else:emit('Dependency requirements unchanged; reusing the existing environment')
        state={'app_id':APP_ID,'version':plan['manifest']['target_version'],'build':plan['manifest']['build'],'updated_at':now(),'transaction':transaction,'steps':[s['id'] for s in steps]}
        write_atomic(data/'install_state.json',json.dumps(state,ensure_ascii=False,indent=2).encode());record('update.committed',**state)
        with (data/'update_history.jsonl').open('a',encoding='utf-8') as out:out.write(json.dumps(state,ensure_ascii=False)+'\n')
        emit('Update complete. Original folder, workspaces and caches retained. Backup: '+str(backup))
        return {'updated':True,**state,'backup':str(backup),'files':len(operations)}
    except BaseException:
        if begun:
            failures=[]
            for name,value in old.items():
                try:
                    path=checked_path(target,name)
                    if value is None:path.unlink(missing_ok=True)
                    else:write_atomic(path,value)
                except OSError:failures.append(name)
            if venv_backup:
                try:shutil.rmtree(target/'.venv');shutil.copytree(backup/'venv',target/'.venv',symlinks=True)
                except OSError:failures.append('.venv')
            if failures:raise UpdateError('Automatic restore incomplete. Keep the backup and restore these paths before restarting: '+', '.join(failures)+' · '+str(backup)) from None
            record('update.rolled_back');emit('Update failed; application files restored. Backup: '+str(backup))
        raise
    finally:lock.unlink(missing_ok=True)
def select_target():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root=tk.Tk();root.withdraw();chosen=filedialog.askdirectory(title='选择原来的香料图鉴文件夹 / Select your existing Spice Atlas folder');root.destroy()
        if chosen:return chosen
    except ImportError:pass
    raise UpdateError('No existing folder selected. Use --target PATH or drag the existing folder onto Update_Atlas.cmd.')
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parent);parser.add_argument('--target',type=Path);parser.add_argument('--dry-run',action='store_true');parser.add_argument('--restart',action='store_true');args=parser.parse_args()
    try:
        target=args.target or Path(select_target());result=apply_update(args.source,target,dry_run=args.dry_run)
        if args.restart and not args.dry_run:
            if os.name=='nt':os.startfile(str(target.resolve()/'run.cmd'))
            else:subprocess.Popen(['bash',str(target.resolve()/'run.sh')],cwd=target.resolve(),start_new_session=True)
        return 0
    except (UpdateError,OSError,ValueError,KeyError) as exc:print('Update stopped: '+str(exc),file=sys.stderr);return 1
if __name__=='__main__':raise SystemExit(main())
