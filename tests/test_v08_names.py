"""Name repair must update searches without overwriting private workspace edits."""
import json,sqlite3,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from atlas.catalogue import Catalogue
from atlas import nomenclature
from atlas.discovery import apply_labels

class NamingRepairTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'catalogue.sqlite3'
        self.old={'id':'gbif-5341394','source_key':'5341394','scientific':'Perilla frutescens','name_zh':'Zi su shu','name_en':'Purple Mint','family':'Lamiaceae','genus':'Perilla','scope':'botanical','aliases':['my-local-alias']}
        with patch.object(nomenclature,'bundle',return_value=None):
            self.cat=Catalogue(self.path,seed=False);self.cat.upsert(self.old)
        self.patch={'id':self.old['id'],'scientific':self.old['scientific'],'source_key':self.old['source_key'],'old':{'name_zh':'Zi su shu','name_en':'Purple Mint','family':'Lamiaceae','name_status':None,'name_provenance':None},'new':{'name_zh':'紫苏','name_en':'Purple Mint','family':'Lamiaceae','name_status':{'zh':'documented','en':'documented'},'name_provenance':{'revision':nomenclature.REVISION,'zh':{'name':'CAS','url':'https://www.gbifchina.org.cn/resource?r=chinacol2023'}}},'add_aliases':['紫蘇'],'membership':None}
        self.data={'revision':nomenclature.REVISION,'checked_at':'2026-10-31T00:00:00Z','entries':[self.patch],'nodes':[],'summary':{'total':1,'chinese_available':1}}
        self.bundle_patch=patch.object(nomenclature,'bundle',return_value=self.data);self.bundle_patch.start()
    def tearDown(self):self.bundle_patch.stop();self.temp.cleanup()
    def edit_before_repair(self,**changes):
        with sqlite3.connect(self.path) as db:
            payload={**self.old,**changes};self.cat.upsert(payload,db=db)
    def test_exact_record_repair_is_searchable_with_source(self):
        value=self.cat.get(self.old['id']);self.assertEqual(value['name_zh'],'紫苏');self.assertEqual(self.cat.page(q='紫苏')['total'],1);self.assertEqual(self.cat.page(q='紫蘇')['total'],1);self.assertEqual(value['name_provenance']['zh']['name'],'CAS')
    def test_custom_name_alias_and_private_file_are_preserved(self):
        marker=self.path.parent/'config.local.json';marker.write_text('private marker');self.edit_before_repair(name_zh='我的紫苏',aliases=['private alias'])
        value=self.cat.get(self.old['id']);self.assertEqual(value['name_zh'],'我的紫苏');self.assertIn('private alias',value['aliases']);self.assertEqual(value['name_status']['zh'],'custom');self.assertEqual(marker.read_text(),'private marker')
    def test_changed_scientific_identity_is_not_renamed(self):
        self.edit_before_repair(scientific='Perilla citriodora');value=self.cat.get(self.old['id']);self.assertEqual(value['scientific'],'Perilla citriodora');self.assertEqual(value['name_zh'],'Zi su shu')
    def test_repair_is_idempotent_and_backup_contains_original(self):
        self.cat.get(self.old['id']);backup=self.path.parent/'catalogue_backups'/(nomenclature.REVISION+'.sqlite3');before=backup.read_bytes();self.cat._names_checked.clear();self.cat.get(self.old['id']);self.assertEqual(backup.read_bytes(),before)
        with sqlite3.connect(backup) as db:self.assertEqual(db.execute('SELECT name_zh FROM entries').fetchone()[0],'Zi su shu')
        with sqlite3.connect(self.path) as db:self.assertEqual(db.execute('SELECT count(*) FROM nomenclature_changes').fetchone()[0],1)
    def test_failure_rolls_back_all_name_changes(self):
        original=self.cat.upsert
        def fail(*a,**k):original(*a,**k);raise RuntimeError('fixture failure')
        with patch.object(self.cat,'upsert',side_effect=fail):
            with self.assertRaisesRegex(RuntimeError,'fixture failure'):self.cat.get(self.old['id'])
        with sqlite3.connect(self.path) as db:self.assertEqual(db.execute('SELECT name_zh FROM entries').fetchone()[0],'Zi su shu')
    def test_conflicting_wikidata_identity_does_not_replace_names(self):
        value=apply_labels(dict(self.old),{'id':'Q1','labels':{'zh':{'value':'无关名称'}},'claims':{'P225':[{'mainsnak':{'datavalue':{'value':'Different species'}}}]}});self.assertEqual(value['name_zh'],'Zi su shu');self.assertIn('mismatch',value['label_resolution_note'])
    def test_full_audit_covers_every_row_and_known_errors(self):
        data=json.loads(nomenclature.ASSET.read_text());self.assertEqual(len(data['entries']),18379);self.assertEqual(data['summary']['identity_conflicts'],0)
        names={p['scientific']:p['new']['name_zh'] for p in data['entries']};self.assertEqual(names['Perilla frutescens'],'紫苏');self.assertEqual(names['Tectona grandis'],'柚木');self.assertEqual(names['Clerodendrum japonicum'],'赪桐');self.assertEqual(names['Hyssopus officinalis'],'神香草')
