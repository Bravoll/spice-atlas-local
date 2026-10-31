"""Reproduce exact-name nomenclature patches from saved primary-source snapshots.

Usage: python scripts/audit_names_v08.py SNAPSHOT_DIR ORIGINAL_DB OUTPUT_DIR
No fuzzy names, machine translations, or taxon-ID substitutions are used.
"""
from __future__ import annotations
import collections,csv,hashlib,io,json,re,sqlite3,sys,unicodedata,zipfile
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import quote
from opencc import OpenCC
SIMPLIFY=OpenCC('t2s')
REVISION='names-20261031-v08-review2'
def key(value):return unicodedata.normalize('NFKC',str(value or '')).strip().casefold()
def chinese(value):return bool(re.search(r'[\u3400-\u9fff]',str(value or '')))
def clean(value):return re.sub(r'\s+',' ',str(value or '')).strip()
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def dwca(path):
    with zipfile.ZipFile(path) as archive:
        rows=csv.DictReader(io.StringIO(archive.read('taxon.txt').decode('utf-8-sig')),delimiter='\t',quoting=csv.QUOTE_NONE)
        result=collections.defaultdict(list)
        for row in rows:
            if row.get('kingdom')=='Plantae':result[key(row['scientificName'])].append(row)
        return result
def entity_names(entity,language):
    langs=['zh-hans','zh','zh-hant'] if language=='zh' else ['en']
    return [entity.get('labels',{}).get(lang,{}).get('value','') for lang in langs]
def p225(entity):return [x.get('mainsnak',{}).get('datavalue',{}).get('value') for x in entity.get('claims',{}).get('P225',[])]
def build(folder,original,output):
    output.mkdir(parents=True,exist_ok=True);checked=datetime.now(timezone.utc).isoformat(timespec='seconds')
    db=sqlite3.connect(original);db.row_factory=sqlite3.Row
    entries=[json.loads(r[0]) for r in db.execute('SELECT payload FROM entries ORDER BY id')]
    nodes=[dict(r) for r in db.execute('SELECT * FROM nodes ORDER BY id')]
    cas=dwca(folder/'china_dwca.zip');tai=dwca(folder/'taicol.zip')
    sources={
      'cas':{'name':'Catalogue of Life China 2023 · CAS','url':'https://www.gbifchina.org.cn/resource?r=chinacol2023&v=1.1','license':'CC BY-NC 4.0','version':'1.1','citation':'The Biodiversity Committee of Chinese Academy of Sciences (2024). Catalogue of Life China 2023 Annual Checklist. Version 1.1. Chinese Academy of Sciences. https://doi.org/10.15468/ae6ush'},
      'taicol':{'name':'TaiCOL · TaiBIF','url':'https://ipt.taibif.tw/resource?r=taibnet_com_all&v=1.13','license':'CC BY 4.0','version':'1.13','citation':'Shao K (2024). The National Checklist of Taiwan (Catalogue of Life in Taiwan, TaiCOL). v1.13. Taiwan Biodiversity Information Facility. https://doi.org/10.15468/auw1kd'},
      'wikidata':{'name':'Wikidata · exact P225','url':'https://www.wikidata.org/','license':'CC0'},
      'gbif':{'name':'GBIF Backbone Taxonomy','url':'https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c','license':'CC BY 4.0'},
      'editorial':{'name':'Curated ingredient record','url':'','license':'project editorial metadata'},
      'existing':{'name':'Previously imported name · not independently confirmed','url':'','license':'see original record'}
    }
    entities={};snapshots=[];records={}
    for path in sorted((folder/'wikidata').glob('*.json')):
        snapshot=json.loads(path.read_text());entities.update(snapshot['data'].get('entities',{}));snapshots.append({k:snapshot[k] for k in ('url','fetched_at','sha256')})
    for path in sorted((folder/'gbif').glob('*.json')):
        snapshot=json.loads(path.read_text());records.update({str(x['key']):x for x in snapshot['data'].get('results',[])});snapshots.append({k:snapshot[k] for k in ('url','fetched_at','sha256')})
    wd_names=collections.defaultdict(list);wd_nodes=collections.defaultdict(list)
    plants=folder/'wikidata_plants.json'
    for path in [plants,*sorted((folder/'wikidata_nodes').glob('*.json'))]:
        if not path.exists():continue
        snapshot=json.loads(path.read_text());snapshots.append({k:snapshot[k] for k in ('url','fetched_at','sha256')})
        for row in snapshot['data'].get('results',{}).get('bindings',[]):
            name=row['name']['value'];label=(row.get('zh') or row.get('label') or {}).get('value','')
            (wd_names if path==plants else wd_nodes)[key(name)].append((label,row['item']['value']))
    for identifier,source_key in [('china_dwca.zip','cas'),('taicol.zip','taicol')]:
        raw=(folder/identifier).read_bytes();snapshots.append({'url':sources[source_key]['url'],'fetched_at':checked,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    conflicts=[];scope_notes=[];patches=[];audit=[];stats=collections.Counter();new_nodes={}
    node_keys={(x['kind'],key(x['label_en'])):x['id'] for x in nodes}
    all_scientific={key(x.get('scientific')) for x in entries};genera={key(x.get('genus')) for x in entries if x.get('genus')}
    def is_scientific(value,scientific):
        v=key(value);s=key(scientific)
        return not v or v in all_scientific or v in genera or (s and v.startswith(s+' ')) or v==s
    def evidence(source,**extra):return {**sources[source],**extra,'checked_at':checked}
    def matching(index,scientific,family=''):
        rows=index.get(key(scientific),[])
        # Do not join homonyms from an unrelated plant family.
        rows=[r for r in rows if not family or not r.get('family') or key(r['family'])==key(family)]
        return sorted(rows,key=lambda r:(r.get('taxonomicStatus','').casefold()!='accepted',not chinese(r.get('vernacularName'))))
    for item in entries:
        scientific=item.get('scientific','');old_zh=item.get('name_zh','');old_en=item.get('name_en') or item.get('english','');curated=item.get('review_state')=='curated';family=item.get('family','');genus=item.get('genus','')
        gbif=records.get(str(item.get('gbif_key') or (item.get('source_key') if item.get('source')=='gbif' else '')))
        if gbif:
            if key(gbif.get('canonicalName') or gbif.get('scientificName'))==key(scientific):
                stats['gbif_exact']+=1;family=gbif.get('family') or family;genus=gbif.get('genus') or genus
            else:conflicts.append({'id':item['id'],'scientific':scientific,'gbif_key':gbif['key'],'gbif_name':gbif.get('canonicalName')});gbif=None
        cr=matching(cas,scientific,family);tr=matching(tai,scientific,family);classification=None;member=None
        if not gbif and (cr or tr):
            row=(cr or tr)[0];family=row.get('family') or family;genus=row.get('genus') or genus;stats['checklist_taxonomy']+=1
            classification=evidence('cas' if cr else 'taicol',record_id=row['taxonID'],scientific_name=row['scientificName'])
            parent='root-botanical'
            for kind,label in [('family',family),('genus',genus)]:
                if not label:continue
                node_id=node_keys.get((kind,key(label)))
                if not node_id:
                    node_id='audit-'+kind+'-'+hashlib.sha256(key(label).encode()).hexdigest()[:12];node_keys[(kind,key(label))]=node_id
                    node={'id':node_id,'label_zh':next((SIMPLIFY.convert(v[0]) for v in wd_nodes.get(key(label),[]) if chinese(v[0])),''),'label_en':label,'kind':kind,'scope':'botanical','source_url':classification['url'],'payload':json.dumps({'name_evidence':classification,'naming_revision':REVISION},ensure_ascii=False)}
                    new_nodes[node_id]={'id':node_id,'old':None,'new':node,'parent':parent,'required_by':[],'evidence':classification}
                if node_id in new_nodes:new_nodes[node_id]['required_by'].append(item['id'])
                parent=node_id;member=node_id
        candidates=[entities.get(q,{}) for q in [item.get('wikidata_id',''),*[r.get('wikidata_id','') for r in item.get('merged_records',[])]]]
        entity=next((e for e in candidates if any(isinstance(n,str) and key(n)==key(scientific) for n in p225(e))),candidates[0] if candidates else {})
        claims=[x for x in p225(entity) if isinstance(x,str)];exact=any(key(x)==key(scientific) for x in claims)
        label_identity=exact or (not scientific and entity.get('id')==item.get('wikidata_id'))
        if entity and claims and not exact:
            (scope_notes if curated else conflicts).append({'id':item['id'],'scientific':scientific,'wikidata':entity.get('id'),'taxon_name_claims':claims,'reason':'ingredient or mixed scope; do not transfer taxon names' if curated else 'scientific identity mismatch'})
        if exact:stats['wikidata_exact']+=1
        if curated and not exact and not claims:scope_notes.append({'id':item['id'],'scientific':scientific,'wikidata':entity.get('id'),'reason':'ingredient scope or genus annotation; keep curated ingredient identity'})
        choices=[]
        if curated and chinese(old_zh):choices.append((old_zh,evidence('editorial')))
        for source,rows in [('cas',cr),('taicol',tr)]:
            for row in rows:
                if chinese(row.get('vernacularName')):choices.append((row['vernacularName'],evidence(source,record_id=row['taxonID'],scientific_name=row['scientificName'],taxonomic_status=row.get('taxonomicStatus'))))
        if label_identity:
            for label in entity_names(entity,'zh'):
                if chinese(label):choices.append((label,evidence('wikidata',url='https://www.wikidata.org/wiki/'+entity['id'],scientific_name=scientific,identity_match='P225' if exact else 'original QID; ingredient/cultivar/concept')))
        for label,url in wd_names.get(key(scientific),[]):
            if chinese(label):choices.append((label,evidence('wikidata',url=url,scientific_name=scientific)))
        if gbif:
            for row in gbif.get('vernacularNames',[]):
                if row.get('language') in ('zho','chi','zh') and chinese(row.get('vernacularName')):choices.append((row['vernacularName'],evidence('gbif',url='https://www.gbif.org/species/'+str(gbif['key']),scientific_name=scientific)))
        if chinese(old_zh) and not choices:choices.append((old_zh,evidence('existing')))
        zh=SIMPLIFY.convert(clean(choices[0][0])) if choices else '';z_evidence=choices[0][1] if choices else None
        en_candidates=[]
        if curated and old_en and not is_scientific(old_en,scientific):en_candidates.append((old_en,evidence('editorial')))
        if label_identity:
            for label in entity_names(entity,'en'):
                if label and not is_scientific(label,scientific):en_candidates.append((label,evidence('wikidata',url='https://www.wikidata.org/wiki/'+entity['id'],scientific_name=scientific)))
        if item.get('source')=='gbif' and old_en and not is_scientific(old_en,scientific):en_candidates.append((old_en,evidence('gbif',url='https://www.gbif.org/species/'+str(item.get('source_key')))))
        if gbif:
            for row in gbif.get('vernacularNames',[]):
                label=clean(row.get('vernacularName'))
                if row.get('language') in ('eng','en') and label and not is_scientific(label,scientific):en_candidates.append((label,evidence('gbif',url='https://www.gbif.org/species/'+str(gbif['key']))))
        if label_identity:
            title=entity.get('sitelinks',{}).get('enwiki',{}).get('title','')
            if title and not is_scientific(title,scientific):en_candidates.append((title,evidence('wikidata',url='https://en.wikipedia.org/wiki/'+quote(title.replace(' ','_')),scientific_name=scientific)))
        if old_en and not is_scientific(old_en,scientific):en_candidates.append((old_en,evidence('existing')))
        en=clean(en_candidates[0][0]) if en_candidates else '';en_evidence=en_candidates[0][1] if en_candidates else None
        family_label=next((SIMPLIFY.convert(x[0]) for x in wd_nodes.get(key(family),[]) if chinese(x[0])),item.get('family_zh',''))
        statuses={'zh':'documented' if zh and z_evidence['name']!=sources['existing']['name'] else ('unverified' if zh else 'missing'),'en':'documented' if en and en_evidence['name']!=sources['existing']['name'] else ('unverified' if en else 'missing')}
        new={'name_zh':zh,'name_en':en,'family':family,'genus':genus,'family_zh':family_label,'name_status':statuses,'name_provenance':{'revision':REVISION,'checked_at':checked,'scientific':scientific,'zh':z_evidence,'en':en_evidence,'taxonomy':evidence('gbif',url='https://www.gbif.org/species/'+str(gbif['key'])) if gbif else classification}}
        added_aliases=list(dict.fromkeys([clean(x[0]) for x in choices]+[SIMPLIFY.convert(clean(x[0])) for x in choices]+[clean(x[0]) for x in en_candidates]))
        patches.append({'id':item['id'],'scientific':scientific,'source_key':str(item.get('source_key','')),'old':{field:item.get(field) for field in new},'new':new,'add_aliases':added_aliases,'membership':member})
        stats['total']+=1;stats['chinese_missing_before']+=not chinese(old_zh);stats['chinese_available']+=bool(zh);stats['english_available']+=bool(en);stats['chinese_missing']+=not zh;stats['english_missing']+=not en;stats['chinese_added']+=not chinese(old_zh) and bool(zh);stats['chinese_changed']+=old_zh!=zh;stats['english_changed']+=old_en!=en;stats['chinese_documented']+=statuses['zh']=='documented';stats['english_documented']+=statuses['en']=='documented'
        audit.append({'id':item['id'],'scientific':scientific,'name_zh':zh,'name_en':en,'family':family,'genus':genus,'zh_status':statuses['zh'],'en_status':statuses['en'],'zh_source':z_evidence,'en_source':en_evidence,'gbif_exact':bool(gbif),'checklist_matches':len(cr)+len(tr)})
    node_patches=[]
    for node in nodes:
        label=node['label_en'];zh=node['label_zh'];ev=None
        if node['kind'] in ('family','genus'):
            candidates=wd_nodes.get(key(label),[])
            if candidates:zh=next((SIMPLIFY.convert(x[0]) for x in candidates if chinese(x[0])),zh);ev=evidence('wikidata',url=candidates[0][1])
        elif node['kind']=='category' and not chinese(zh):
            # Exact category pair from recorded bilingual Wiki memberships, never a guessed translation.
            name=label.removeprefix('Category:')
            fixed={'Spices':'香辛料','Herbs':'香草','Herbalism':'草药学','Condiments':'调味品','Herbal teas':'草本茶','Spice mixes':'混合香料','Chili peppers':'辣椒','Culinary herbs and spices':'烹饪香草与香辛料','Medicinal plants':'药用植物','Lamiaceae':'唇形科','Apiaceae':'伞形科','Piperaceae':'胡椒科'}
            zh=fixed.get(name,'')
            if zh:ev={'name':'Editorial category label','url':node['source_url'],'checked_at':checked}
        if zh and not chinese(zh):zh=''
        node_patches.append({'id':node['id'],'old':{k:node[k] for k in ('label_zh','label_en','kind')},'new':{'label_zh':SIMPLIFY.convert(zh),'label_en':label},'evidence':ev})
    node_patches.extend(new_nodes.values())
    stats['nodes_total']=len(node_patches);stats['nodes_named_zh']=sum(bool(x['new']['label_zh']) for x in node_patches);stats['nodes_scientific_only']=len(node_patches)-stats['nodes_named_zh'];stats['identity_conflicts']=len(conflicts);stats['material_scope_notes']=len(scope_notes)
    summary={'revision':REVISION,'checked_at':checked,**dict(stats),'method':'Exact scientific names and original source IDs. Source-documented vernaculars, not invented translations. Missing names remain explicit.','source_versions':sources}
    write(output/'corrections.json',{'revision':REVISION,'checked_at':checked,'entries':patches,'nodes':node_patches,'summary':summary});write(output/'summary.json',summary);write(output/'audit_records.json',audit);write(output/'source_snapshots.json',snapshots);write(output/'identity_conflicts.json',conflicts);write(output/'material_scope_notes.json',scope_notes)
    with (output/'names.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        fields=['id','scientific','name_zh','name_en','family','genus','zh_status','en_status','zh_source','en_source','gbif_exact','checklist_matches'];writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for row in audit:writer.writerow({**row,'zh_source':json.dumps(row['zh_source'],ensure_ascii=False),'en_source':json.dumps(row['en_source'],ensure_ascii=False)})
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':build(*(Path(x) for x in sys.argv[1:]))
