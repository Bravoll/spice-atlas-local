"""Build a portable release plus an in-place update manifest."""
import argparse,json,sqlite3,tempfile,zipfile,sys,tomllib,os,hashlib
from pathlib import Path
from release_support import ROOT,release_files,release_bytes,update_manifest,inherited_payloads
sys.path.insert(0,str(ROOT))
from atlas.seed import ensure_baseline

def build(out=None,previous=None,base_release=None):
    ensure_baseline(ROOT/'data/catalogue.sqlite3')
    version=tomllib.loads((ROOT/'pyproject.toml').read_text())['project']['version'];label='Spice_Atlas_Local_v'+'.'.join(version.split('.')[:2]);out=Path(out or ROOT.parent/(label+'.zip'))
    files=release_files();manifest=update_manifest(files,previous,base_release=base_release);legacy=inherited_payloads(manifest,base_release)
    out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent,prefix='.atlas-build-') as temporary:
        target=Path(temporary)/'catalogue.sqlite3';source=sqlite3.connect(ROOT/'data/catalogue.sqlite3');destination=sqlite3.connect(target)
        source.backup(destination);destination.execute('PRAGMA journal_mode=DELETE');destination.close();source.close()
        release_seed=json.loads((ROOT/'data/catalogue_seed.json').read_text())
        with target.open('rb') as baseline:release_seed.update(uncompressed_bytes=target.stat().st_size,sha256=hashlib.file_digest(baseline,'sha256').hexdigest())
        staged=Path(temporary)/'release.zip'
        with zipfile.ZipFile(staged,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
            for path in files:
                name=path.relative_to(ROOT).as_posix();raw=json.dumps(release_seed,ensure_ascii=False,indent=2).encode()+b'\n' if name=='data/catalogue_seed.json' else release_bytes(path)
                archive.writestr(label+'/'+name,raw)
            for name,raw in legacy.items():archive.writestr(label+'/'+name,raw)
            archive.write(target,label+'/data/catalogue.sqlite3')
            archive.writestr(label+'/update_manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
        with staged.open('rb') as ready:os.fsync(ready.fileno())
        with zipfile.ZipFile(staged) as ready:
            if ready.testzip() is not None:raise ValueError('Release ZIP checksum failed')
        os.replace(staged,out)
    return {'path':str(out),'version':version,'bytes':out.stat().st_size,'files':len(files)+2+len(legacy),'update_files':sum(len(step['files']) for step in manifest['steps']),'dependencies_changed':any(step['dependencies_changed'] for step in manifest['steps'])}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('output',nargs='?');parser.add_argument('--previous-release',action='append');parser.add_argument('--base-release');args=parser.parse_args();print(json.dumps(build(args.output,args.previous_release,args.base_release)))
