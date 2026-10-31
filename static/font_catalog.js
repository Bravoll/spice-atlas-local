"use strict";
/* Font names are identifiers, not promises of installation or glyph coverage. */
const fontCatalogue=[
 ['system-serif','serif',{en:'System serif',zh:'系统衬线体',ja:'標準セリフ',fr:'Sérif système',de:'System-Serif',es:'Serif del sistema',ko:'시스템 명조',ru:'Системный с засечками',pt:'Serif do sistema'}],
 ['system-sans','sans-serif',{en:'System sans serif',zh:'系统无衬线体',ja:'標準ゴシック',fr:'Sans sérif système',de:'System-Sans',es:'Sans serif del sistema',ko:'시스템 고딕',ru:'Системный без засечек',pt:'Sem serifa do sistema'}],
 ['noto-serif-sc','Noto Serif SC',{zh:'Noto 简体中文衬线体'}],['noto-sans-sc','Noto Sans SC',{zh:'Noto 简体中文无衬线体'}],
 ['noto-serif-tc','Noto Serif TC',{zh:'Noto 繁体中文衬线体'}],['noto-sans-tc','Noto Sans TC',{zh:'Noto 繁体中文无衬线体'}],
 ['songti','Songti SC',{zh:'宋体（macOS）'}],['simsun','SimSun',{zh:'宋体（Windows）'}],['kaiti','KaiTi',{zh:'楷体'}],['stkaiti','STKaiti',{zh:'华文楷体'}],['yahei','Microsoft YaHei',{zh:'微软雅黑'}],['pingfang','PingFang SC',{zh:'苹方'}],
 ['times','Times New Roman',{zh:'新罗马'}],['georgia','Georgia',{zh:'乔治亚'}],['palatino','Palatino Linotype',{zh:'帕拉蒂诺'}],['cambria','Cambria',{}],['arial','Arial',{}],['verdana','Verdana',{}],
 ['cormorant','Cormorant Garamond',{zh:'鸬鹚加拉蒙'}],['cinzel','Cinzel',{}],['mashan','Ma Shan Zheng',{zh:'马善政楷体'}],
 ['noto-serif-jp','Noto Serif JP',{zh:'Noto 日文衬线体'}],['noto-sans-jp','Noto Sans JP',{zh:'Noto 日文无衬线体'}],['yu-mincho','Yu Mincho',{zh:'游明朝',ja:'游明朝'}],['yu-gothic','Yu Gothic',{zh:'游黑体',ja:'游ゴシック'}],['meiryo','Meiryo',{ja:'メイリオ',zh:'明瞭体'}],
 ['noto-serif-kr','Noto Serif KR',{zh:'Noto 韩文衬线体'}],['noto-sans-kr','Noto Sans KR',{zh:'Noto 韩文无衬线体'}],['malgun','Malgun Gothic',{ko:'맑은 고딕',zh:'清晰黑体'}],['noto-serif','Noto Serif',{zh:'Noto 通用衬线体'}],['noto-sans','Noto Sans',{zh:'Noto 通用无衬线体'}]
].map(([id,family,names])=>({id,family,names}));
const fontAliasesHant={"系统衬线体": "系統襯線體", "系统无衬线体": "系統無襯線體", "Noto 简体中文衬线体": "Noto 簡體中文襯線體", "Noto 简体中文无衬线体": "Noto 簡體中文無襯線體", "Noto 繁体中文衬线体": "Noto 繁體中文襯線體", "Noto 繁体中文无衬线体": "Noto 繁體中文無襯線體", "宋体（macOS）": "宋體（macOS）", "宋体（Windows）": "宋體（Windows）", "楷体": "楷體", "华文楷体": "華文楷體", "微软雅黑": "微軟雅黑", "苹方": "蘋方", "新罗马": "新羅馬", "乔治亚": "喬治亞", "帕拉蒂诺": "帕拉蒂諾", "鸬鹚加拉蒙": "鸕鷀加拉蒙", "马善政楷体": "馬善政楷體", "Noto 日文衬线体": "Noto 日文襯線體", "Noto 日文无衬线体": "Noto 日文無襯線體", "游明朝": "遊明朝", "游黑体": "遊黑體", "明瞭体": "明瞭體", "Noto 韩文衬线体": "Noto 韓文襯線體", "Noto 韩文无衬线体": "Noto 韓文無襯線體", "清晰黑体": "清晰黑體", "Noto 通用衬线体": "Noto 通用襯線體", "Noto 通用无衬线体": "Noto 通用無襯線體"};
const localFontRegistry=new Map();let localFontRevision=0;
// Proper family names remain unchanged where a localized alias is not recorded.
const extraFontAliases={times:{ja:'タイムズ・ニュー・ローマン',ko:'타임스 뉴 로먼',ru:'Таймс Нью Роман'},songti:{ja:'宋体',ko:'송체',ru:'Сунти'},simsun:{ja:'宋体',ko:'송체',ru:'Симсун'},kaiti:{ja:'楷体',ko:'해서체',ru:'Кайти'},stkaiti:{ja:'華文楷体',ko:'화문 해서체'},yahei:{ja:'マイクロソフト ヤヘイ',ko:'맑은 중국어 고딕'},meiryo:{ko:'메이리오'},'yu-mincho':{ko:'유 명조'},'yu-gothic':{ko:'유 고딕'}};
const notoLocaleNames={sc:{en:'Simplified Chinese',ja:'簡体字中国語',fr:'chinois simplifié',de:'Vereinfachtes Chinesisch',es:'chino simplificado',ko:'중국어 간체',ru:'упрощённый китайский',pt:'chinês simplificado'},tc:{en:'Traditional Chinese',ja:'繁体字中国語',fr:'chinois traditionnel',de:'Traditionelles Chinesisch',es:'chino tradicional',ko:'중국어 번체',ru:'традиционный китайский',pt:'chinês tradicional'},jp:{en:'Japanese',ja:'日本語',fr:'japonais',de:'Japanisch',es:'japonés',ko:'일본어',ru:'японский',pt:'japonês'},kr:{en:'Korean',ja:'韓国語',fr:'coréen',de:'Koreanisch',es:'coreano',ko:'한국어',ru:'корейский',pt:'coreano'}};
const fontKindNames={serif:{en:'serif',ja:'セリフ',fr:'sérif',de:'Serif',es:'serif',ko:'명조',ru:'с засечками',pt:'serif'},sans:{en:'sans serif',ja:'サンセリフ',fr:'sans sérif',de:'Sans-Serif',es:'sans serif',ko:'고딕',ru:'без засечек',pt:'sem serifa'}};
for(const row of fontCatalogue){Object.assign(row.names,extraFontAliases[row.id]||{});const match=/^noto-(serif|sans)-(sc|tc|jp|kr)$/.exec(row.id);if(match)for(const lang of ['en','ja','fr','de','es','ko','ru','pt'])row.names[lang]='Noto · '+notoLocaleNames[match[2]][lang]+' · '+fontKindNames[match[1]][lang];}
fontAliasesHant['游明朝']='游明朝';fontAliasesHant['游黑体']='游黑體';
function fontLanguage(code){return String(code||'en').startsWith('zh')?'zh':String(code||'en').split('-')[0];}
function fontLabel(row,locale=state.locale){const name=row.names?.[fontLanguage(locale)];return name&&name!==row.family?row.family+' · '+(locale==='zh-Hant'?(fontAliasesHant[name]||name):name):row.family;}
function fontRows(){return [...fontCatalogue,...localFontRegistry.values()];}
function validFontFamily(value){return typeof value==='string'&&value.length<=120&&!/[\x00-\x1f;{}<>]/.test(value);}
function fontFamily(value){if(!value)return '';return fontRows().find(x=>x.id===value)?.family||(value.startsWith('local:')?value.slice(6):value.startsWith('custom:')?value.slice(7):'');}
function cssFontFamily(value){const family=fontFamily(value);return validFontFamily(family)?(['serif','sans-serif','monospace'].includes(family)?family:JSON.stringify(family)):'inherit';}
function fillFontSelect(select,selected='',inherit=true){
 if(!select)return;const rows=fontRows();if(selected&&!rows.some(x=>x.id===selected)&&fontFamily(selected))rows.push({id:selected,family:fontFamily(selected),names:{}});
 const key=[state.locale,localFontRevision,selected,inherit].join('|');if(select.dataset.fontOptions===key)return;
 select.innerHTML=(inherit?'<option value="">'+esc(t('fontDefault'))+'</option>':'')+rows.map(row=>'<option value="'+esc(row.id)+'">'+esc(fontLabel(row))+'</option>').join('');select.value=selected;select.dataset.fontOptions=key;
}
async function discoverLocalFonts(){
 const status=$('localFontStatus');if(typeof window.queryLocalFonts!=='function'){status.textContent=t('localFontsUnavailable');return;}
 status.textContent=t('localFontsReading');
 try{const fonts=await window.queryLocalFonts();const known=new Set(fontCatalogue.map(x=>x.family.toLowerCase()));localFontRegistry.clear();
  for(const item of fonts.slice(0,10000)){const family=item.family;if(validFontFamily(family)&&!known.has(family.toLowerCase())){known.add(family.toLowerCase());localFontRegistry.set('local:'+family,{id:'local:'+family,family,names:{}});}}
  localFontRevision++;status.textContent=t('localFontsLoaded',{count:localFontRegistry.size});refreshFontControls();
 }catch{status.textContent=t('localFontsDenied');}
}
function settingsChineseFontLanguage(){return state.locale==='zh-Hant'?'zh-Hant':'zh-Hans';}
function refreshFontControls(){
 renderNameplates();fillFontSelect($('readerFontFamily'),(readerDraft||state.prefs).reader_font_family||'');
 for(const [id,lang] of [['defaultChineseNameFont',settingsChineseFontLanguage()],['defaultWesternNameFont','en']])fillFontSelect($(id),state.prefs.name_fonts?.[lang]||state.prefs.name_fonts?.[fontLanguage(lang)]||'');
 $('readLocalFonts').disabled=typeof window.queryLocalFonts!=='function';$('localFontStatus').textContent||=t(typeof window.queryLocalFonts==='function'?'localFontsPrivacy':'localFontsUnavailable');
}
function setupFontCatalogue(){
 $('readLocalFonts').addEventListener('click',discoverLocalFonts);
 $('readerFontFamily').addEventListener('change',()=>changeReaderDraft({reader_font_family:$('readerFontFamily').value}));
 $('applyCustomFont').addEventListener('click',()=>{const family=$('customFontFamily').value.trim();if(!family||!validFontFamily(family)){$('localFontStatus').textContent=t('fontInvalid');return;}const id='custom:'+family;localFontRegistry.set(id,{id,family,names:{}});localFontRevision++;changeReaderDraft({reader_font_family:id});refreshFontControls();});
}
