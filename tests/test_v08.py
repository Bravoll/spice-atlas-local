import unittest
from test_v07_revision import RevisedFixture

class TypographyAndReadingTests(RevisedFixture,unittest.TestCase):
    def test_font_choices_are_isolated_per_workspace_and_survive_copy(self):
        from atlas.workspaces import workspaces
        first=workspaces.current_id
        patch={'name_fonts':{'en':'times','zh-Hant':'kaiti','ja':'yu-mincho'},'reader_font_family':'custom:My Local Font'}
        self.assertEqual(self.client.post('/api/settings',json=patch).status_code,200)
        copy=workspaces.create('With fonts','copy');workspaces.switch(copy['id']);self.assertEqual(self.client.get('/api/settings').json()['name_fonts'],patch['name_fonts'])
        fresh=workspaces.create('Without fonts','default');workspaces.switch(fresh['id']);self.assertEqual(self.client.get('/api/settings').json()['name_fonts'],{});self.assertEqual(self.client.get('/api/settings').json()['reader_font_family'],'')
        workspaces.switch(first);self.assertEqual(self.client.get('/api/settings').json()['reader_font_family'],'custom:My Local Font')
    def test_css_control_characters_and_invalid_font_maps_are_rejected_without_saving(self):
        for payload in [{'reader_font_family':'custom:A; background:url(x)'},{'reader_font_family':'local:Bad\nFont'},{'name_fonts':{'not-a-language':'times'}},{'name_fonts':{'en':42}},{'name_fonts':[]},{'reader_font_family':'url(https://example.org/font)'}]:
            with self.subTest(payload=payload):self.assertEqual(self.client.post('/api/settings',json=payload).status_code,400)
        self.assertEqual(self.client.get('/api/settings').json()['name_fonts'],{})
    def test_selected_local_font_name_is_saved_but_inventory_is_not_an_api_field(self):
        self.assertEqual(self.client.post('/api/settings',json={'name_fonts':{'en':'local:Aptos Display'}}).status_code,200)
        self.assertEqual(self.client.post('/api/settings',json={'local_font_inventory':['Aptos','Private Font']}).status_code,400)
    def test_reading_view_roundtrip_filters_nested_non_view_configuration(self):
        body={'immersive':True,'readingQuery':'basil','nameFonts':{'en':'times'},'exploreReading':{'entry':'basil','source':'gbif','mainScroll':400,'lm_api_key':'must-not-save'},'api_key':'must-not-save'}
        self.assertEqual(self.client.post('/api/view-state',json=body).status_code,200);value=self.client.get('/api/view-state').json()
        self.assertTrue(value['immersive']);self.assertEqual(value['nameFonts'],{'en':'times'});self.assertEqual(value['exploreReading']['mainScroll'],400);self.assertNotIn('lm_api_key',value['exploreReading']);self.assertNotIn('api_key',value)
    def test_malformed_reading_state_is_rejected(self):
        for value in [{'immersive':'yes'},{'readingQuery':'x'*121},{'nameFonts':{'en':'custom:A;B'}},{'exploreReading':[]}]:
            with self.subTest(value=value):self.assertEqual(self.client.post('/api/view-state',json=value).status_code,400)
