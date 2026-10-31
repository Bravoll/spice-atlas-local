"""Per-version settings; secrets remain write-only in the HTTP API."""
from __future__ import annotations
import json,os,threading
from pathlib import Path
from urllib.parse import urlsplit
from .workspaces import workspaces

LANGUAGES={'auto','zh-Hans','zh-Hant','en'}
TRANSLATION_LANGUAGES=LANGUAGES|{'ja','ko','fr','de','es','pt','it','ru','ar','hi','th','vi','id'}
DEFAULTS={
 'ui_language':'auto','content_language':'auto','translation_language':'auto','auto_translate':True,
 'translation_provider':'local','excluded_languages':[],'lm_enabled':False,
 'lm_base_url':'http://127.0.0.1:1234/v1','lm_model':'','lm_api_key':'',
 'google_translate_key':'','azure_translate_key':'','azure_region':'',
 'google_api_key':'','google_cse_id':'','user_agent':'SpiceAtlas/0.8 (local botanical reference reader)',
 'proxy_url':'','trust_env':True,'timeout_seconds':25,'live_first':True,'image_mode':'direct',
 'browser_images':True,'appearance':'light','history_order':'recent',
 'reader_font_family':'','name_fonts':{},'reader_font_size':17,'reader_line_height':1.85,'reader_font':'serif','animation_level':2,
 'startup_mode':'resume','random_scope':'culinary',
 'name_chinese_style':'botanical','name_western_style':'book',
 'shortcuts':{'tree_previous':'[','tree_next':']','entry_previous':',','entry_next':'.'},
 'prefetch_enabled':True,'cache_weight_history':0.2,'cache_weight_session':0.3,'cache_weight_recent':0.5,'cache_session_threshold':30,'cache_promote_hits':6,
 'other_source_timeout':25,'other_total_timeout':35,'other_max_cards':6,'other_search_enabled':True,
}
ENV={'lm_base_url':'LM_BASE_URL','lm_model':'LM_MODEL','lm_api_key':'LM_API_KEY','google_api_key':'GOOGLE_API_KEY',
 'google_cse_id':'GOOGLE_CSE_ID','user_agent':'SPICE_USER_AGENT','proxy_url':'SPICE_PROXY_URL',
 'google_translate_key':'GOOGLE_TRANSLATE_KEY','azure_translate_key':'AZURE_TRANSLATE_KEY','azure_region':'AZURE_TRANSLATE_REGION'}
SECRET_FIELDS={'lm_api_key','google_api_key','google_translate_key','azure_translate_key'}
class Preferences:
 def __init__(self,path=None):self._path=Path(path) if path else None;self.lock=threading.RLock()
 @property
 def path(self):return self._path or workspaces.directory()/'config.local.json'
 @path.setter
 def path(self,value):self._path=Path(value) if value else None
 @path.deleter
 def path(self):self._path=None
 def values(self):
  data={**DEFAULTS,'excluded_languages':[],'name_fonts':{}};saved={}
  if self.path.is_file():
   saved=json.loads(self.path.read_text('utf-8'))
   for key,value in saved.items():
    mapped=next((k for k,env in ENV.items() if env==key),key)
    if mapped in DEFAULTS or mapped=='model_test':data[mapped]=value
  for key in ('ui_language','content_language','translation_language'):
   if data[key]=='zh':data[key]='zh-Hans'
  if 'lm_enabled' not in saved and (saved.get('lm_model') or saved.get('model_test')):data['lm_enabled']=True
  for key,env in ENV.items():
   if env in os.environ:data[key]=os.environ[env]
  return data
 def public(self):
  value=self.values();provider=value['translation_provider']
  value['translation_ready']=bool(provider=='local' and value['lm_enabled'] or provider=='google' and value['google_translate_key'] or provider=='azure' and value['azure_translate_key'])
  for key in SECRET_FIELDS:value['has_'+key]=bool(value.pop(key,''))
  test=value.get('model_test',{});value['model_ready']=bool(test.get('ok') and test.get('base_url')==value['lm_base_url'] and (not value['lm_model'] or value['lm_model'] in test.get('available_model_ids',[])))
  value['environment_overrides']=[k for k,env in ENV.items() if env in os.environ];return value
 def save(self,patch):
  if set(patch)-set(DEFAULTS)-{'clear_'+x for x in SECRET_FIELDS}:raise ValueError('Unknown setting')
  current=self.values();old=(current['lm_base_url'],current['lm_api_key'],current['lm_model'])
  for key,value in patch.items():
   if key.startswith('clear_'):continue
   if key in SECRET_FIELDS and not value:continue
   if key in ('ui_language','content_language','translation_language'):
    if value=='zh':value='zh-Hans'
    if value not in (TRANSLATION_LANGUAGES if key=='translation_language' else LANGUAGES):raise ValueError('Unsupported language')
   elif key in ('auto_translate','trust_env','live_first','browser_images','lm_enabled','other_search_enabled','prefetch_enabled'):
    if not isinstance(value,bool):raise ValueError(key+' must be boolean')
   elif key in {'name_fonts','reader_font_family'}:
    from .typography import name_fonts,valid_font
    if key=='name_fonts':value=name_fonts(value)
    elif not valid_font(value):raise ValueError('Invalid reader font')
   elif key=='shortcuts':
    if not isinstance(value,dict) or set(value)!=set(DEFAULTS['shortcuts']):raise ValueError('Provide all four catalogue shortcuts')
    value={k:str(v).lower() for k,v in value.items()}
    if len(set(value.values()))!=4 or any(len(v)!=1 or not 33<=ord(v)<=126 or v in {'?','/','r'} for v in value.values()):raise ValueError('Shortcuts must be four distinct ASCII letters or punctuation; R, / and ? are reserved')
   elif key in {'cache_weight_history','cache_weight_session','cache_weight_recent'}:
    if not isinstance(value,(int,float)) or isinstance(value,bool) or not 0<=value<=1:raise ValueError('Cache weights must be between 0 and 1')
   elif key in {'cache_session_threshold','cache_promote_hits'}:
    low,high=(5,500) if key=='cache_session_threshold' else (2,100)
    if not isinstance(value,int) or isinstance(value,bool) or not low<=value<=high:raise ValueError('Unsupported '+key)
   elif key=='excluded_languages':
    if not isinstance(value,list) or len(value)>40 or any(x not in (TRANSLATION_LANGUAGES|{'zh'})-{'auto'} for x in value):raise ValueError('Unsupported excluded language')
    value=list(dict.fromkeys(value))
   elif key=='timeout_seconds':
    if not isinstance(value,(int,float)) or isinstance(value,bool) or not 5<=value<=120:raise ValueError('Timeout must be 5–120 seconds')
   elif key in ('reader_font_size','reader_line_height','animation_level','other_source_timeout','other_total_timeout','other_max_cards'):
    low,high={'reader_font_size':(14,28),'reader_line_height':(1.5,2.3),'animation_level':(0,3),'other_source_timeout':(1,30),'other_total_timeout':(2,60),'other_max_cards':(1,12)}[key]
    if not isinstance(value,(int,float)) or isinstance(value,bool) or not low<=value<=high:raise ValueError('Unsupported '+key)
    if key in {'reader_font_size','animation_level','other_max_cards'} and value!=int(value):raise ValueError(key+' must be an integer')
   elif key in ('name_chinese_style','name_western_style'):
    if value not in ({'botanical','scroll'} if key=='name_chinese_style' else {'book','inscription'}):raise ValueError('Unsupported name typography')
   elif key in ('image_mode','translation_provider','appearance','history_order','reader_font','startup_mode','random_scope'):
    options={'image_mode':{'direct','proxy'},'translation_provider':{'local','google','azure','off'},'appearance':{'light','dark'},'history_order':{'recent','custom'},'reader_font':{'serif','sans','kai'},'startup_mode':{'resume','basil','random'},'random_scope':{'culinary','botanical','all'}}
    if value not in options[key]:raise ValueError('Unsupported '+key)
   elif key=='lm_base_url':
    value=str(value).strip().rstrip('/');p=urlsplit(value)
    if p.scheme not in {'http','https'} or not p.hostname or p.username or p.password or p.query or p.fragment:raise ValueError('Invalid model base URL')
    if not p.path or p.path=='/':value+='/v1'
   elif key=='proxy_url' and value:
    p=urlsplit(str(value))
    if p.scheme not in {'http','https','socks5','socks5h'} or not p.hostname or p.username or p.password:raise ValueError('Invalid proxy URL')
   elif not isinstance(value,str):raise ValueError(key+' must be text')
   current[key]=value
  if sum(current[k] for k in ('cache_weight_history','cache_weight_session','cache_weight_recent'))<=0:raise ValueError('At least one cache weight must be positive')
  for field in SECRET_FIELDS:
   if patch.get('clear_'+field):current[field]=''
  if old!=(current['lm_base_url'],current['lm_api_key'],current['lm_model']):current.pop('model_test',None)
  self._write(current);return self.public()
 def _write(self,value):
  with self.lock:
   self.path.parent.mkdir(parents=True,exist_ok=True);tmp=self.path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2),'utf-8');tmp.replace(self.path)
   try:self.path.chmod(0o600)
   except OSError:pass
 def model_test(self,result):
  value=self.values();value['model_test']=result;self._write(value)
preferences=Preferences()
