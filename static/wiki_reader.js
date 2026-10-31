"use strict";
/* Wikipedia has a language selector; independent web sources retain two rows. */
function wikiPreference(){
 if(state.source?.startsWith('enwiki'))return 'en';
 if(state.source?.startsWith('zhwiki'))return state.wikiLocale?.startsWith('zh')?state.wikiLocale:prefLanguage('content_language').startsWith('zh')?prefLanguage('content_language'):'zh-Hans';
 return state.wikiLocale||prefLanguage('content_language');
}
function wikiMapping(){return state.wikiInfo?.mapping||Object.fromEntries(Object.entries(state.entry?.wiki||{}).map(([key,value])=>[key.replace(/wiki$/,''),value]));}
function renderWikiPicker(){
 const box=$('wikiLanguageGroup');if(!state.entry)return;
 const mapping=wikiMapping(),wanted=wikiPreference(),codes=[...new Set([wanted,'en','zh-Hans','zh-Hant'])];
 const labels={en:'English', 'zh-Hans':'简体中文','zh-Hant':'繁體中文'};
 const available=codes.filter(code=>mapping[code.startsWith('zh')?'zh':'en']);
 $('wikiLanguage').innerHTML=available.map(code=>'<option value="'+code+'">'+labels[code]+'</option>').join('');
 $('wikiLanguage').value=available.includes(wanted)?wanted:available[0]||'en';$('wikiLanguage').disabled=!available.length;
 const active=state.source==='auto'&&!state.entry.policy?.domestic||/^(en|zh)wiki/.test(state.source);box.dataset.active=String(active);$('activateWiki').setAttribute('aria-pressed',String(active));$('activateWiki').disabled=!available.length;$('activateWiki').title=t('readWikipedia');
 $('wikiLanguageStatus').hidden=!state.wikiResolving&&!(wanted.startsWith('zh')&&!mapping.zh);box.title=t('wikiLanguageHint');$('wikiLanguageStatus').textContent=state.wikiResolving?t('wikiLanguageChecking'):wanted.startsWith('zh')&&!mapping.zh?t(state.wikiInfo?.state==='resolved'?'wikiChineseMissing':'wikiLanguageUnconfirmed'):t('wikiLanguageHint');
}
async function loadWikiLanguages(entryId,entryEpoch,refresh=false){
 state.wikiResolving=true;renderWikiPicker();
 try{
  const info=await api('/api/wiki-languages/'+encodeURIComponent(entryId)+'?refresh='+Boolean(refresh));
  if(entryEpoch!==state.entryEpoch||entryId!==state.id)return;
  state.wikiInfo=info;state.entry.wiki={...state.entry.wiki,...Object.fromEntries(Object.entries(info.mapping||{}).filter(([lang])=>['en','zh'].includes(lang)).map(([lang,title])=>[lang+'wiki',title]))};
 }catch{}finally{if(entryEpoch===state.entryEpoch){state.wikiResolving=false;renderWikiPicker();}}
}
function preserveReadingPosition(render){
 const main=$('main'),top=main.scrollTop,windowTop=window.scrollY||0;render();
 if(!state.anchorPinned){main.scrollTop=top;if((window.scrollY||0)!==windowTop)window.scrollTo?.(0,windowTop);}
}
function renderWebResults(article){
 const messages={verification_required:'searchVerification',blocked_redirect:'searchConnectionError',timeout:'searchTimedOut',connection_error:'searchConnectionError',http_error:'searchConnectionError',no_extractable_results:'searchNoResults',ok:'searchResultsNote'};
 $('articleBody').innerHTML='<p class="source-feedback">'+esc(t(messages[article.status]||'searchNoResults'))+'</p>'+(article.results||[]).map((row,i)=>'<article class="web-result"><h3>'+ext(row.url,row.title)+'</h3><small>'+esc(row.domain||row.url)+'</small>'+(row.summary?'<p>'+esc(row.summary)+'</p>':'')+(row.readable?'<button class="quiet-button" type="button" data-read-result="'+i+'">'+esc(t('readReviewedArticle'))+'</button>':'')+'</article>').join('')+'<p>'+ext(article.source_url,t('openSearch'),'primary-link')+'</p>';
 if(!article.results?.length&&article.embed_can_try){
  try{const url=new URL(article.embed_url);if(url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&['www.bing.com','cn.bing.com','www.google.com','google.com'].includes(url.hostname)){
   const frame=document.createElement('iframe');frame.className='web-search-frame';frame.title=t('originalSearchView');frame.src=url.href;frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');$('articleBody').appendChild(frame);
  }}catch{}
 }
 $('articleBody').querySelectorAll('[data-read-result]').forEach(button=>button.addEventListener('click',()=>act({type:'readResult',url:article.results[Number(button.dataset.readResult)].url})));
 $('outline').textContent=t('noChapters');$('articleCredit').innerHTML=ext(article.source_url,t('source'));$('readerControls').hidden=true;
}
async function readWebResult(url,refresh=false){
 const epoch=++state.articleEpoch,entryId=state.id;$('articleBody').setAttribute('aria-busy','true');$('sourceMeta').textContent=t('loading');
 try{let article=await cachedResource({kind:'web_article',entry:entryId,url},refresh);if(epoch!==state.articleEpoch||entryId!==state.id)return;if(!article)article=await api('/api/source-read/'+encodeURIComponent(entryId)+'?'+new URLSearchParams({url,refresh:String(!!refresh)}));await acceptArticle(article,epoch);if(epoch===state.articleEpoch)state.sourceReadUrl=url;}
 catch(error){if(epoch===state.articleEpoch)showNotice('articleWarning',errorMessage(error));}
 finally{if(epoch===state.articleEpoch)$('articleBody').removeAttribute('aria-busy');}
}
function homeView(){return {entry:'basil',form:null,source:'auto',wikiLocale:null,sourceReadUrl:null,imageProvider:'commons',imageProfile:'auto',query:'',readingQuery:'',nameFonts:{},exploreReading:null,scope:'all',node:null,path:[],offset:0,treeOffset:0,group:'all',collection:'catalogue',readerMode:state.immersive?'full':'focus',textMode:'original',typeStyle:'botanical',nameChineseStyle:state.prefs.name_chinese_style||'botanical',nameWesternStyle:state.prefs.name_western_style||'book',frameOpen:false,frameExpanded:false,frameMode:'responsive',anchor:'',mainScroll:0,catalogScroll:0,treeScroll:0,entryScroll:0,windowScroll:0};}
async function returnHome(){
 state.nameChineseStyle=null;state.nameWesternStyle=null;state.nameFonts={};state.exploreReading=null;$('readingSearch').value='';$('readingSearchResults').hidden=true;
 state.anchor='';state.anchorPinned=false;state.scope='all';state.collection='catalogue';state.node=null;state.path=[];state.offset=0;catalogNav.treeOffset=0;state.group='all';state.mode=state.immersive?'full':'focus';state.frameMode='responsive';state.wikiLocale=null;
 $('search').value='';$('catalogScope').value='all';$('collectionMode').value='catalogue';$('typeStyle').value='botanical';updateGroups();closeFrame();$('main').scrollTop=0;window.scrollTo?.(0,0);
 await Promise.all([loadTree(),loadCatalogue(),loadEntry('basil')]);
}

let interfaceLanguageSave=Promise.resolve();
async function changeInterfaceLanguage(language){
 const revision=state.languageRevision=(state.languageRevision||0)+1;
 if(state.confirmedUILanguage===undefined)state.confirmedUILanguage=state.prefs.ui_language||'auto';
 state.articleEpoch++;state.entryEpoch++;state.wikiLocale=null;state.prefs.ui_language=language;applyLanguage();
 interfaceLanguageSave=interfaceLanguageSave.catch(()=>{}).then(async()=>{const result=await post('/api/settings',{ui_language:language});state.confirmedUILanguage=result.ui_language;return result;});
 try{const result=await interfaceLanguageSave;if(revision!==state.languageRevision)return;state.prefs={...state.prefs,ui_language:result.ui_language};await Promise.all([loadTree(),loadCatalogue(),loadEntry(state.id,state.form,{imageProvider:state.imageProvider,imageProfile:state.imageProfile})]);}
 catch(error){if(revision===state.languageRevision){state.prefs.ui_language=state.confirmedUILanguage;applyLanguage();showNotice('globalMessage',errorMessage(error));}}
}
