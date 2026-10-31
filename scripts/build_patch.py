"""Create a small update bundle from a full release; no user data."""
import argparse,copy,json,zipfile
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from update import chain_for
def build(full_release,out,from_version=None):
    with zipfile.ZipFile(full_release) as source:
        root=source.namelist()[0].split('/')[0]+'/';manifest=json.loads(source.read(root+'update_manifest.json'));patch=copy.deepcopy(manifest)
        if from_version:patch['steps']=chain_for(patch,from_version)
        label='Spice_Atlas_Update_v'+'.'.join(patch['steps'][0]['from_versions'][0].split('.')[:2])+'_to_v'+'.'.join(manifest['target_version'].split('.')[:2]);written=set()
        with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
            for step in patch['steps']:
                for row in step['files']:
                    if row.get('delete'):continue
                    original=row['source'];row['source']='payload/'+original
                    if original not in written:archive.writestr(label+'/'+row['source'],source.read(root+original));written.add(original)
            archive.writestr(label+'/update_manifest.json',json.dumps(patch,ensure_ascii=False,indent=2))
            for name in ['update.py','Update_Atlas.cmd','Update_Atlas.sh','docs/UPGRADING.zh-CN.md','docs/UPGRADING.en.md']:archive.writestr(label+'/'+name,source.read(root+name))
    return {'path':str(out),'bytes':Path(out).stat().st_size,'payload_files':len(written),'base_commit':manifest['base_commit']}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('full_release');p.add_argument('output');p.add_argument('--from-version');a=p.parse_args();print(json.dumps(build(a.full_release,a.output,a.from_version)))
