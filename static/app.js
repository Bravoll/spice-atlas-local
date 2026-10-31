"use strict";
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const ext=(url,label,cls="")=>'<a class="'+esc(cls)+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
const originalLabels={};document.querySelectorAll("[data-i18n]").forEach(el=>{originalLabels[el.getAttribute("data-i18n")]=el.textContent;});
const state={prefs:{},ui:"zh",scope:"all",collection:"catalogue",locale:"en",version:"",health:null,healthRevision:null,pendingHealth:false,restoring:false,node:null,path:[],group:"all",offset:0,limit:30,records:[],entry:null,id:"",form:"",source:"auto",actualSource:null,article:null,mode:"focus",lang:"original",translation:null,imageProvider:"commons",imageProfile:"auto",entryEpoch:0,articleEpoch:0,imageEpoch:0,catalogEpoch:0,treeEpoch:0,jobsTimer:null,activeSettings:"reading"};
function t(key,values={}){let result=window.ATLAS_I18N[state.locale]?.[key]??window.ATLAS_I18N[state.ui]?.[key]??originalLabels[key]??window.ATLAS_I18N.en[key]??key;return String(result??"").replace(/\{(\w+)\}/g,(_,k)=>values[k]??"");}
const browserLanguage=()=>navigator.languages?.[0]||navigator.language||"en";
function detectedLocale(){const value=browserLanguage().toLowerCase();return value.startsWith("zh")?(/hant|-tw|-hk|-mo/.test(value)?"zh-Hant":"zh-Hans"):"en";}
function scientificOf(e){return state.ui==="en"?(e.scientific_en||e.scientific||""):e.scientific||"";}
function nameOf(e){return state.ui==="en"?(e.name_en||e.scientific_en||e.scientific||e.name):(state.locale==="zh-Hant"?(e.name_zh_hant||e.name_hant||e.name_zh||e.name_en||e.name):(e.name_zh||e.name_en||e.name));}
function prefLanguage(key){const val=state.prefs[key];return val&&val!=="auto"?val:state.locale;}
function translationAvailable(){const provider=state.prefs.translation_provider;return state.prefs.translation_ready&&state.health?.services?.["translation_"+provider]?.ok!==false;}

function showNotice(id,text){$(id).hidden=!text;$(id).textContent=text||"";}
function formatDate(value){if(!value)return "";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString(state.locale==="zh-Hant"?"zh-TW":state.ui==="zh"?"zh-CN":"en-AU",{dateStyle:"short",timeStyle:"short"});}
function delivery(value){return t(({live:"live",cache:"cache",memory_cache:"memoryCache",retained_cache:"retainedCache",stale_cache:"staleCache",editorial:"editorial"})[value]||"live");}
async function api(path,options={}){const headers={...(options.headers||{})};if(typeof resourceUi!=="undefined"&&resourceUi.eventId&&!headers["X-Atlas-Event"])headers["X-Atlas-Event"]=resourceUi.eventId;if(state.version)headers["X-Atlas-Version"]=state.version;resourceUi.inflight++;let response;try{response=await fetch(path,{...options,headers});}finally{resourceUi.inflight--;}let value;try{value=await response.json();}catch{throw new Error(t("networkError"));}if(!response.ok){if(response.status===409&&value.active_version){try{sessionStorage.removeItem("atlas-reload");}catch{}location.reload();}const error=new Error(typeof value.error==="string"?value.error:typeof value.detail==="string"?value.detail:t("error"));error.diagnostic=value.diagnostic;error.paused=!!value.paused;throw error;}return value;}
async function directJSON(url,params){traceUiEvent('browser.request',{provider:new URL(url).hostname});resourceUi.inflight++;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),11000);try{const response=await fetch(url+"?"+new URLSearchParams(params),{signal:controller.signal,credentials:"omit"});const data=await response.json();traceUiEvent('browser.response',{provider:new URL(url).hostname,ok:response.ok&&!data.error});if(!response.ok||data.error)throw new Error("Source API failed");return data;}finally{clearTimeout(timer);resourceUi.inflight--;}}

const post=(url,value={})=>api(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
function errorMessage(error){const code=error.diagnostic?.code;return ({forbidden:t("forbidden"),rate_limited:t("rateLimited"),network_error:t("networkError"),timeout:t("networkError"),all_sources_failed:t("allSourcesFailed"),model_unavailable:t("modelNotReady"),translation_failed:t("translationFailed")})[code]||error.message;}
function applyLanguage(){
 const preference=state.prefs.ui_language||"auto";state.locale=preference==="auto"?detectedLocale():preference;state.ui=state.locale==="en"?"en":"zh";document.documentElement.lang=state.locale;
 document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.getAttribute("data-i18n"));});document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.placeholder=t(el.getAttribute("data-i18n-placeholder"));});
 $("uiLanguage").value=preference;$("catalogPrevious").title=t("previous");$("catalogNext").title=t("next");refreshShortcutLabels();appearance(state.prefs.appearance==="dark");
 if(state.entry){renderEntry();renderSources();}renderNotifications();updateExperienceLabels();applyReadingChrome();renderCatalogueLayout();renderBrowserCapability();
}
function scopeRoot(){return state.scope==="botanical"?"root-botanical":state.scope==="culinary"?"root-culinary":"root-all";}

async function loadCatalogue(reset=false){
  if(reset)state.offset=0;const epoch=++state.catalogEpoch;state.catalogBusy=true;$("catalogPrevious").disabled=true;$("catalogNext").disabled=true;
  const params=new URLSearchParams({q:$("search").value.trim(),scope:state.scope,offset:String(state.offset),limit:String(state.limit),collection:state.collection});
  if(state.node)params.set("node",state.node);if(state.group!=="all"&&state.scope==="culinary")params.set("group",state.group);
  if(!state.records.length)$("catalogList").innerHTML='<p class="subtle-note">'+t("loadingLocal")+'</p>';
  try{
    const data=await api("/api/catalog?"+params);if(epoch!==state.catalogEpoch)return;
    state.records=data.entries;$("catalogCount").textContent=Number(data.total).toLocaleString();const signature=JSON.stringify(data.entries.map(e=>[e.id,nameOf(e)])),changed=signature!==state.catalogSignature;state.catalogSignature=signature;
    $("catalogList").innerHTML=data.entries.length?data.entries.map(e=>'<button type="button" class="catalog-item" data-entry="'+esc(e.id)+'" aria-current="'+(e.id===state.id)+'"><span><span class="cn">'+esc(nameOf(e))+'</span><span class="en">'+esc(state.ui==="zh"?e.english:scientificOf(e)||e.name_zh||"")+'</span></span><span class="index">›</span></button>').join(""):'<p class="subtle-note">'+t("empty")+'</p>';
    $("catalogList").querySelectorAll("[data-entry]").forEach(button=>button.addEventListener("click",()=>act({type:"entry",id:button.dataset.entry})));
    $("catalogPage").textContent=(data.total?state.offset+1:0)+"–"+Math.min(state.offset+state.limit,data.total)+" / "+data.total.toLocaleString();
    $("catalogPrevious").disabled=state.offset===0;$("catalogNext").disabled=!data.has_more;updateCatalogueRegion(data);if(changed)revealList($("catalogList"));
    $("catalogStats").textContent=t("catalogueStats",data.stats);$("catalogStats").title=$("catalogStats").textContent;$("scopeWarning").title=$("scopeWarning").textContent;$("scopeWarning").hidden=state.scope==="culinary";$("groupFilters").hidden=state.scope!=="culinary";
  }catch(error){if(epoch===state.catalogEpoch)$("catalogList").innerHTML='<p class="subtle-note">'+esc(errorMessage(error))+'</p>';}finally{if(epoch===state.catalogEpoch){state.catalogBusy=false;updateRepeatButton();if(catalogNav.pendingEntries){catalogNav.pendingEntries=false;loadCatalogue();}}}
}
async function loadTree(){return loadTreePage();}

function updateGroups(){$("groupFilters").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.group===state.group)));}
function formName(form){if(state.ui==="zh")return state.locale==="zh-Hant"?(form.name_hant||form.name):form.name;return form.name_en||({flakes:"Dried flakes",fresh:"Fresh",leaf:"Leaves / shoots",seed:"Seeds / fruits",ground:"Ground",bark:"Bark",whole:"Whole",bud:"Dried buds",overview:"Overview"})[form.id]||form.name;}
function renderForms(){
  $("forms").innerHTML=state.entry.forms.map(form=>'<button type="button" data-form="'+esc(form.id)+'" aria-pressed="'+(form.id===state.form)+'">'+esc(formName(form))+'</button>').join("");
  $("forms").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>act({type:"form",form:b.dataset.form})));
}
function applyForm(){const f=state.entry.forms.find(x=>x.id===state.form)||state.entry.forms[0];document.body.dataset.theme=f.theme||"neutral";$("partLabel").textContent=formName(f);}
function sourceName(source){if(state.ui==="en")return ({auto:"Auto",zhwiki:"Chinese Wikipedia",enwiki:"English Wikipedia",baidu:"Baidu Baike",gbif:"GBIF taxonomy",wikidata:"Wikidata",icar:"ICAR",nparks:"NParks",mccormick:"McCormick"})[source.id]||source.name_en||source.name;return source.name;}
function renderEntry(){
  const e=state.entry;document.title=nameOf(e)+" · Spice Atlas";
  $("entryName").textContent=nameOf(e);$("entryEnglish").textContent=state.ui==="zh"?e.english:e.name_zh||e.scientific||"";$("scientific").textContent=scientificOf(e);
  $("entryIntro").textContent=(state.ui==="en"?e.intro_en:state.locale==="zh-Hant"?e.intro_hant:e.intro)||(e.scope==="botanical"?t("referenceOnly"):t("candidate"));
  $("familyLabel").textContent=(state.ui==="zh"?(state.locale==="zh-Hant"?e.family_zh_hant:e.family_zh):e.family)||e.family||"";$("entryReview").textContent=t(e.review_state==="curated"?"curated":e.scope==="botanical"?"referenceOnly":"candidate");
  renderForms();applyForm();renderSpecimen();renderPronunciation();if(inkMotion.kind==='language'){revealInkText($('chineseName'),'language');revealInkText($('specimenTitle'),'language');revealInkText($('entryIntro'),'language');}
  $("favoriteEntry").textContent=t(e.favorite?"favoriteRemove":"favoriteAdd");$("favoriteEntry").setAttribute("aria-pressed",String(!!e.favorite));
  const facts=state.ui==="en"?e.facts_en:state.locale==="zh-Hant"?(e.facts_hant||e.facts):e.facts;
  $("facts").innerHTML=(facts||[{label:t("nameIdentity"),text:scientificOf(e)||nameOf(e),url:e.sources.find(s=>s.available)?.url||e.sources[0]?.url||"https://www.wikidata.org"},{label:t("partForm"),text:e.forms.map(formName).join(" / "),url:e.sources[0]?.url||"https://www.wikidata.org"},{label:t("sourceCoverage"),text:t("readSource"),url:e.sources.find(s=>s.id==="enwiki")?.url||e.sources[0]?.url||"https://www.wikidata.org"}]).map(f=>'<div class="fact"><p class="label">'+esc(f.label)+'</p><p>'+esc(f.text)+'</p>'+ext(f.url,t("source")+" ↗")+'</div>').join("");
  $("exportEntry").href="/api/export/"+encodeURIComponent(e.id);
  $("relatedSection").hidden=!e.related?.length;$("related").innerHTML=(e.related||[]).map(r=>'<button type="button" data-related="'+esc(r.id)+'"><strong>'+esc(state.ui==="en"?(r.name_en||r.name):(state.locale==="zh-Hant"?r.name_hant:r.name||r.name_en))+'</strong><small>'+esc(t("relatedFamily",{family:e.family}))+'</small></button>').join("");
  $("related").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>act({type:"entry",id:b.dataset.related})));
}
function renderSources(){
 renderImageProfiles();
 renderWikiPicker();
 const sources=(state.entry.sources||[]).filter(s=>!["enwiki","zhwiki"].includes(s.id));$("sourceTabs").innerHTML=[true,false].map(primary=>{const rows=sources.filter(s=>s.primary===primary);return rows.length?'<div class="source-language-group"><span>'+esc(t(primary?"primaryLanguage":"secondaryLanguage"))+'</span>'+rows.map(s=>'<button type="button" data-source="'+esc(s.key)+'" aria-pressed="'+(s.key===state.source||state.source==="auto"&&state.entry.policy?.domestic&&s===sources[0])+'">'+esc(sourceName(s))+(s.kind==="external"?" ↗":"")+'</button>').join("")+'</div>':"";}).join("")||'<p class="subtle-note">'+t("noServices")+'</p>';
 $("sourceTabs").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>act({type:"source",source:b.dataset.source})));
 const kinds={api:"sourceKindApi",search:"sourceKindSearch",reference:"sourceKindReference",external:"sourceKindExternal"};$("sourceCards").innerHTML=sources.filter(s=>s.kind!=="aggregate").map(s=>'<article class="source-card"><h3>'+esc(sourceName(s))+'</h3><p>'+esc(t(kinds[s.kind]||'sourceKindReference'))+' · '+esc(s.language)+'</p>'+ext(s.url,t("openSource"))+'</article>').join("");
 const gateways=state.entry.image_gateways||{};$("imageTabs").querySelectorAll("button").forEach(b=>{b.hidden=!gateways[b.dataset.provider];});
 $("retranslate").hidden=!translationAvailable();
}

function renderSpecimen(){renderNameplates();}
async function loadEntry(id,preferredForm,options={}){
 readingEntryStart();stopOtherSources(true);pronunciationEpoch++;stopPronunciation();state.pronunciation=null;
 if(typeof ensureRemoteOperation==='function')ensureRemoteOperation(id);
 const epoch=++state.entryEpoch;state.wikiInfo=null;state.wikiLocale=options.wikiLocale||null;state.articleEpoch++;state.imageEpoch++;state.id=id;state.source=options.source||"auto";state.sourceReadUrl=null;state.actualSource=null;state.article=null;state.translation=null;state.lang="original";state.imageProvider=options.imageProvider||"commons";state.imageProfile=options.imageProfile||"auto";state.requestedTextMode=options.textMode||null;
 showNotice("globalMessage","");$("heroImageWrap").innerHTML='<span class="image-empty">'+t("loading")+'</span>';closeFrame();
 try{const entry=await api("/api/entry/"+encodeURIComponent(id)+"?browser_language="+encodeURIComponent(browserLanguage()));if(epoch!==state.entryEpoch)return;
 state.entry=entry;state.form=entry.forms.some(f=>f.id===preferredForm)?preferredForm:entry.forms[0].id;
 if(state.source!=="auto"&&!entry.sources.some(s=>s.key===state.source))state.source="auto";
 if(!entry.image_gateways?.[state.imageProvider])state.imageProvider=Object.keys(entry.image_gateways||{}).find(x=>x!=="query")||"commons";
 state.wikiReady=loadWikiLanguages(id,epoch);
 renderEntry();renderSources();loadPronunciation();animateArrival(document.querySelector('.hero-copy'));animateArrival(document.querySelector('.hero-figure'),'image');$("languageMode").value="original";$("catalogList").querySelectorAll("[data-entry]").forEach(b=>b.setAttribute("aria-current",String(b.dataset.entry===id)));
 post("/api/history/"+encodeURIComponent(id)).catch(()=>{});await Promise.allSettled([loadArticle(),loadImages()]);if(epoch===state.entryEpoch){settleReadingAnchor();rememberView();}
 }catch(error){if(epoch===state.entryEpoch)showNotice("globalMessage",errorMessage(error));}
}

function renderArticle(){return preserveReadingPosition(()=>{renderArticleContent();updateOutlinePresentation();});}
function renderArticleContent(){
  const a=state.article;if(!a)return;
  $("readerControls").hidden=a.mode!=="article";$("sourceTitle").textContent=a.title||"";
  $("sourceJump").href=a.source_url;$("sourceMeta").textContent=[a.delivery?delivery(a.delivery):"",formatDate(a.fetched_at),a.transport==="browser-cors"?t("browserTransport"):"",a.revision_id?"rev. "+a.revision_id:""].filter(Boolean).join(" · ");
  showNotice("scopeNote",state.entry.scope==="botanical"?t("referenceOnly"):(state.locale==="zh-Hant"?state.entry.scope_note_hant:state.entry.scope_note)||"");
  const warning=a.warning?(a.diagnostic?.code==="forbidden"?t("forbidden"):t("sourceFailed")):a.fallback?t(a.fallback.reason==="missing_language"?"fallbackMissing":"fallbackNetwork"):"";showNotice("articleWarning",warning);
  if(a.mode==="search_results"){renderWebResults(a);return;}
  if(a.mode!=="article"){
    $("articleBody").innerHTML='<div class="external-panel"><p>'+esc(a.diagnostic?a.message:a.mode==="unavailable"?t("noWiki"):a.mode==="external"?t("readSource"):a.summary||a.message||t("readSource"))+'</p>'+ext(a.source_url,t("openSource"),"primary-link")+(a.reference_links||[]).map(l=>'<p>'+ext(l.url,l.label+" ↗")+'</p>').join("")+'</div>';
    $("outline").textContent=t("noChapters");$("articleCredit").innerHTML="";revealReadingText($("articleBody"));settleReadingAnchor();return;
  }
  $("focusMode").setAttribute("aria-pressed",String(state.mode==="focus"));$("fullMode").setAttribute("aria-pressed",String(state.mode==="full"));
  if(state.lang!=="original"&&state.translation){
    const translated=state.translation;showNotice("translationNote",t("translationReady")+" · "+t("translatedScope")+" · "+translated.model);
    $("articleBody").innerHTML=translated.blocks.map(b=>state.lang==="bilingual"?'<div class="translation-pair"><div class="original">'+b.original_html+'</div><div>'+b.translated_html+'</div></div>':b.translated_html).join("");$("outline").textContent=t("translatedScope");
  }else{
    showNotice("translationNote","");$("articleBody").innerHTML=state.mode==="focus"?a.focus_html:a.html;
    const toc=state.mode==="focus"?a.focus_toc:a.toc;$("outline").innerHTML=toc?.length?toc.map(h=>'<a data-level="'+h.level+'" href="#'+esc(h.id)+'">'+esc(h.title)+'</a>').join(""):esc(t("noChapters"));
  }
  $("articleCredit").innerHTML=esc(t(a.translation_supported===false?"publicSourceNote":"chapterNote"))+"<br>"+[[a.source_url,t("source")],[a.revision_url,t("fixedVersion")],[a.authors_url,t("authors")],[a.license_url,a.license]].filter(row=>row[0]).map(row=>ext(...row)).join(" · ")+(!a.license_url&&a.license?" · "+esc(a.license):"");
  $("focusMode").hidden=$("fullMode").hidden=$("languageMode").hidden=a.translation_supported===false;$("languageMode").disabled=a.translation_supported===false;$("retranslate").hidden=a.translation_supported===false||!translationAvailable();
  revealReadingText($("articleBody"));
  settleReadingAnchor();
}
async function acceptArticle(article,epoch){
 if(epoch!==state.articleEpoch)return;$("articleBody").removeAttribute("aria-busy");state.article=article;state.actualSource=article.source;state.translation=null;state.lang="original";$("languageMode").value="original";renderArticle();settleReadingAnchor();
 const requested=state.requestedTextMode;state.requestedTextMode=null;const target=prefLanguage("translation_language");const same=article.language==="en"?target==="en":article.variant==="zh-hant"?target==="zh-Hant":target==="zh-Hans";
 if(article.mode==="article"&&article.translation_supported!==false&&translationAvailable()&&!same&&(requested&&requested!=="original"||!requested&&state.prefs.auto_translate)){state.lang=requested||"bilingual";$("languageMode").value=state.lang;await setLanguage();}
}
async function browserArticleData(entryId,source){
 const variant=wikiPreference()==="zh-Hant"?"zh-hant":"zh-hans";const plan=await api("/api/browser-plan/article/"+encodeURIComponent(entryId)+"?source="+source+"&variant="+variant);const data=await directJSON(plan.url,plan.params);return post("/api/browser-ingest/article",{entry_id:entryId,source,variant,data});
}
function articleSelection(){
 const explicit=state.source.split(':')[0],wiki=['zhwiki','enwiki'].includes(explicit);
 if(wiki||state.source==='auto'&&!state.entry.policy?.domestic){
  const id=wiki?explicit:(wikiPreference().startsWith('zh')?'zhwiki':'enwiki');
  const existing=state.entry.sources.find(s=>s.id===id);if(existing)return existing;
  const host=id==='zhwiki'?'https://zh.wikipedia.org':'https://en.wikipedia.org',title=state.entry.wiki?.[id];
  return {id,key:id,name:id==='zhwiki'?'中文维基':'英文维基',name_en:id==='zhwiki'?'Chinese Wikipedia':'English Wikipedia',kind:'api',url:host+(title?'/wiki/'+encodeURIComponent(title.replaceAll(' ','_')):'/w/index.php?search='+encodeURIComponent(state.entry.scientific||state.entry.english))};
 }
 return state.entry.sources.find(s=>s.key===state.source)||state.entry.sources[0];
}
async function loadArticle(refresh=false){
 if(state.immersive)return loadReadingArticle(refresh);
 state.sourceReadUrl=null;
 if(state.source==='other'){state.source='other';state.articleEpoch++;return loadOtherSources(refresh);}
 stopOtherSources(true);
 const epoch=++state.articleEpoch;state.article=null;state.translation=null;state.lang="original";$("languageMode").disabled=false;$("articleBody").setAttribute("aria-busy","true");if(!$("articleBody").textContent.trim())$("articleBody").innerHTML='<p class="loading">'+t("loading")+'</p>';$("articleCredit").innerHTML="";showNotice("translationNote","");showNotice("articleWarning","");
 const wikiSource=/^(en|zh)wiki(?:[:]|$)/.test(state.source)||state.source==='auto'&&!state.entry.policy?.domestic;
 if(refresh&&wikiSource)state.wikiReady=loadWikiLanguages(state.id,state.entryEpoch,true);
 if(wikiSource&&state.wikiReady&&(refresh||wikiPreference().startsWith("zh")&&!state.entry.wiki?.zhwiki))await state.wikiReady;if(epoch!==state.articleEpoch)return;
 const selected=articleSelection();if(!selected){$("articleBody").removeAttribute("aria-busy");$("articleBody").textContent=t("noServices");$("sourceMeta").textContent="";return;}
 $("sourceTitle").textContent=sourceName(selected);$("sourceJump").href=selected.url;$("sourceMeta").textContent=t("loading");renderSources();
 try{const cached=await cachedResource({kind:'article',entry:state.id,source:state.source==='auto'&&!state.entry.policy?.domestic?selected.id:state.source,preferred:wikiPreference(),variant:wikiPreference()},refresh);if(epoch!==state.articleEpoch)return;if(cached){await acceptArticle(cached,epoch);return;}const article=await api("/api/article/"+encodeURIComponent(state.id)+"?"+new URLSearchParams({source:state.source,preferred:wikiPreference(),refresh:String(Boolean(refresh||state.prefs.live_first)),browser_language:browserLanguage()}));await acceptArticle(article,epoch);}
 catch(error){if(epoch!==state.articleEpoch)return;
 if(["zhwiki","enwiki"].includes(selected.id)){const alternatives=[selected.id,...(state.source==="auto"?[selected.id==="zhwiki"?"enwiki":"zhwiki"]:[])];for(const source of [...new Set(alternatives)]){try{const value=await browserArticleData(state.id,source);await acceptArticle(value,epoch);return;}catch{if(epoch!==state.articleEpoch)return;}}}
 $("articleBody").removeAttribute("aria-busy");$("sourceMeta").textContent=t("failed");$("articleBody").innerHTML='<div class="external-panel"><p>'+esc(errorMessage(error))+'</p>'+ext(selected.url,t("openSource"),"primary-link")+'</div>';showNotice("articleWarning",errorMessage(error));}
}

async function setLanguage(refresh=false){
  const revision=state.translationEpoch=(state.translationEpoch||0)+1,epoch=state.articleEpoch,current=()=>revision===state.translationEpoch&&epoch===state.articleEpoch;
  if(!state.article||state.article.mode!=="article"||state.article.translation_supported===false)return;state.lang=$("languageMode").value;$("languageMode").disabled=false;
  if(state.lang==="original"){renderArticle();return;}
  if((state.article.language==="en"?"en":state.article.variant==="zh-hant"?"zh-Hant":"zh-Hans")===prefLanguage("translation_language")){state.lang="original";$("languageMode").value="original";renderArticle();showNotice("translationNote",t("noTranslationNeeded"));return;}
  if(state.translation&&!refresh){renderArticle();return;}
  if(!translationAvailable()){state.lang="original";$("languageMode").value="original";showNotice("translationNote",t("modelNotReady"));return;}
  const request={entry_id:state.id,source:state.actualSource,target:prefLanguage("translation_language"),variant:state.article.variant||"zh-hans",revision_id:state.article.revision_id,refresh:Boolean(refresh)};
  showNotice("translationNote",t("translationLoading"));$("languageMode").disabled=true;
  try{let value=await cachedResource({kind:"translation",entry:request.entry_id,source:request.source,target:request.target,variant:request.variant,revision:request.revision_id},refresh);if(!current())return;if(!value)value=await post("/api/translate",request);if(!current())return;if(value.skipped){state.lang="original";$("languageMode").value="original";}else state.translation=value;renderArticle();}
  catch(error){if(!current())return;state.lang="original";$("languageMode").value="original";renderArticle();showNotice("translationNote",errorMessage(error));}
  finally{if(current())$("languageMode").disabled=false;}
}
function imageError(img,id){
 img.addEventListener("error",()=>{if(id&&!img.src.includes("/api/media/")){img.src="/api/media/"+id;imageError(img);return;}const replacement=document.createElement("div");replacement.className="image-failure";replacement.textContent=t("imageUnavailable");img.replaceWith(replacement);},{once:true});
}

function renderImages(data){
  renderImageQuery(data);
  state.currentImages=data.images||[];
  const names={commons:"Commons",baidu:t("baiduImages"),bing:"Bing",google:"Google"};
  $("imageGateways").innerHTML=Object.entries(names).filter(([key])=>data.gateways[key]).map(([key,label])=>ext(data.gateways[key],label+" ↗")).join("");
  $("imageStatus").textContent=(data.images?.length?t("imageCandidates",{count:data.images.length}):t("noImages"))+" · "+(data.delivery?delivery(data.delivery):"")+" · "+(data.image_mode==="direct"?t("photosDirect"):"");
  if(data.warning)$("imageStatus").textContent+=" · "+(data.diagnostic?.code==="forbidden"?t("forbidden"):t("networkError"));
  if(!data.images?.length){$("imageGrid").innerHTML='<div class="external-panel">'+(data.gateways[state.imageProvider]?ext(data.gateways[state.imageProvider],t("openSearch"),"primary-link"):esc(t("noServices")))+'</div>';if(state.imageProvider==="commons"){$("heroImageWrap").innerHTML='<span class="image-empty">'+t("noImages")+'</span>';$("heroCaption").textContent=t("photosDirect");}return;}
  $("imageGrid").innerHTML=data.images.map((im,i)=>'<article class="image-card"><button class="image-open" type="button" data-image="'+i+'" aria-label="'+esc(im.title)+'"><img src="'+esc(im.display_url)+'" alt="'+esc(im.description||im.title)+'" loading="lazy" referrerpolicy="no-referrer"></button><div class="image-copy"><h3>'+esc(im.title)+'</h3><div class="image-author">'+esc(im.author)+' · '+esc(im.license)+'</div><div class="image-links">'+ext(im.source_url,t("source")+" ↗")+ext(im.original_url,t("originalImage")+" ↗")+(im.license_url?ext(im.license_url,t("license")+" ↗"):"")+'</div></div></article>').join("");
  $("imageGrid").querySelectorAll(".image-card").forEach((card,i)=>{imageError(card.querySelector("img"),data.images[i].id);card.querySelector("button").addEventListener("click",event=>openImage(data.images[i],event.currentTarget));});
  animateArrival($("imageGrid"),'image');
  if(state.imageProvider==="commons"){const im=data.images[0];const image=document.createElement("img");image.src=im.display_url;image.alt=im.description||im.title;image.referrerPolicy="no-referrer";imageError(image,im.id);$("heroImageWrap").replaceChildren(image);$("heroCaption").innerHTML=ext(im.source_url,t("candidatePhoto")+" · "+im.author.slice(0,65))+" · "+esc(im.license);}
}
async function loadImages(refresh=false){
 void prepareBrowserSource(state.immersive?'commons':state.imageProvider);
 if(state.immersive)return loadReadingImages(refresh);
 $('browserSourceFallback').hidden=true;renderImageQuery({gateways:state.entry.image_gateways});
 const epoch=++state.imageEpoch;const entryId=state.id,formId=state.form,provider=state.imageProvider;closeFrame();$("imageStatus").textContent=t("imageLoading");$("imageGrid").innerHTML="";$("imageStatus").dataset.busy="true";
 const gateways=state.entry.image_gateways||{};$("imageGateways").innerHTML=Object.entries(gateways).filter(([key])=>key!=="query").map(([key,url])=>ext(url,key+" ↗")).join("");$("imageTabs").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.provider===provider)));
 if(provider==="commons"){$("heroImageWrap").innerHTML='<span class="image-empty">'+t("fetchingImages")+'</span>';$("heroCaption").textContent="";}
 try{
 let data=await cachedResource({kind:'images',entry:entryId,provider,form:formId,profile:state.imageProfile},refresh);if(epoch!==state.imageEpoch)return;
 if(!data&&provider==='commons'&&state.prefs.browser_images!==false){try{
  const plan=await api('/api/browser-plan/images/'+encodeURIComponent(entryId)+'?form='+encodeURIComponent(formId)+'&profile='+encodeURIComponent(state.imageProfile)),pages=[];
  for(const params of plan.queries||[plan.params]){
   const raw=await directJSON(plan.url,params);if(epoch!==state.imageEpoch)return;pages.push(...(raw.query?.pages||[]));
   const unique=[...new Map(pages.map(x=>[x.pageid||x.title,x])).values()];
   data=await post('/api/browser-ingest/images',{entry_id:entryId,form:formId,profile:state.imageProfile,browser_language:browserLanguage(),data:{query:{pages:unique}}});
   if(epoch!==state.imageEpoch)return;if(data.images?.length)break;
  }
 }catch{if(epoch!==state.imageEpoch)return;if(!data?.images?.length)data=null;}}

 if(!data)data=await api("/api/images/"+encodeURIComponent(entryId)+"?"+new URLSearchParams({provider,form:formId,profile:state.imageProfile,refresh:String(Boolean(refresh||state.prefs.live_first)),browser_language:browserLanguage()}));if(epoch!==state.imageEpoch)return;
 data.gateways=data.gateways||gateways;data.gateways=Object.fromEntries(Object.entries(data.gateways).filter(([key])=>key==="query"||gateways[key]));renderImages(data);if(provider!=="commons")await openFrame(data.frame_check);
 }catch(error){if(epoch===state.imageEpoch){$("imageStatus").textContent=errorMessage(error);if(provider==="commons"){$("heroImageWrap").innerHTML='<span class="image-empty">'+esc(t("imageUnavailable"))+'</span>';$("heroCaption").textContent="";}}}finally{if(epoch===state.imageEpoch)delete $("imageStatus").dataset.busy;}
}

function openImage(im,origin){showImageViewer(im,origin);}
function closeFrame(){state.frameEpoch=(state.frameEpoch||0)+1;clearSourceWindow();}
async function openFrame(knownCheck=null){
  if(state.imageProvider==="commons"){showNotice("globalMessage",t("noFrameForCommons"));return;}
  const epoch=state.frameEpoch=(state.frameEpoch||0)+1;
  $("imageStatus").textContent=t("frameLoading");
  try{const result=knownCheck||await api("/api/frame/"+encodeURIComponent(state.id)+"?provider="+state.imageProvider+"&form="+encodeURIComponent(state.form)+"&browser_language="+encodeURIComponent(browserLanguage())+"&profile="+encodeURIComponent(state.imageProfile));if(epoch!==state.frameEpoch)return;if(!result.can_try){await offerBrowserSource(result,epoch);if(epoch!==state.frameEpoch)return;$("imageStatus").textContent=t(result.code==="verification_required"?"searchVerification":result.code==="frame_denied"?"framePolicyDenied":"frameBlocked");return;}void releaseBrowserSplit();$("frameContainer").hidden=false;$("frameStatus").textContent=t("frameAttempt");$("imageStatus").textContent=t("sourceWindowShown");$("sourceFrame").src=result.url;sourceInline();}
  catch(error){$("imageStatus").textContent=errorMessage(error);}
}

function fillSettings(){fillCacheSettings();
  const p=state.prefs;
  $("settingsUILanguage").value=p.ui_language||"auto";$("contentLanguage").value=p.content_language||"auto";$("translationTarget").value=p.translation_language||"auto";
  $("imageDelivery").value=p.image_mode||"direct";$("autoTranslate").checked=p.auto_translate;$("liveFirst").checked=p.live_first;
  $("modelBase").value=p.lm_base_url||"";$("modelId").value=p.lm_model||"";$("modelKey").value="";$("modelKey").placeholder=t(p.has_lm_api_key?"savedKey":"noSavedKey");$("clearModelKey").checked=false;
  $("userAgent").value=p.user_agent||"";$("proxyUrl").value=p.proxy_url||"";$("networkTimeout").value=p.timeout_seconds||25;$("otherSourceTimeout").value=p.other_source_timeout||25;$("otherTotalTimeout").value=p.other_total_timeout||35;$("otherMaxCards").value=p.other_max_cards||6;$("otherSearchEnabled").checked=p.other_search_enabled!==false;$("trustEnvironment").checked=p.trust_env;
  $("googleKey").value="";$("googleKey").placeholder=t(p.has_google_api_key?"savedKey":"noSavedKey");$("googleCx").value=p.google_cse_id||"";$("clearGoogleKey").checked=false;
}
function settingsValue(){return {...collectCacheSettings(),ui_language:$("settingsUILanguage").value,content_language:$("contentLanguage").value,translation_language:$("translationTarget").value,
  image_mode:$("imageDelivery").value,auto_translate:$("autoTranslate").checked,live_first:$("liveFirst").checked,
  lm_base_url:$("modelBase").value,lm_model:$("modelId").value,lm_api_key:$("modelKey").value,clear_lm_api_key:$("clearModelKey").checked,
  user_agent:$("userAgent").value,proxy_url:$("proxyUrl").value,timeout_seconds:Number($("networkTimeout").value),other_source_timeout:Number($("otherSourceTimeout").value)||8,other_total_timeout:Number($("otherTotalTimeout").value)||20,other_max_cards:Number($("otherMaxCards").value)||6,other_search_enabled:$("otherSearchEnabled").checked,trust_env:$("trustEnvironment").checked,
  google_api_key:$("googleKey").value,google_cse_id:$("googleCx").value,clear_google_api_key:$("clearGoogleKey").checked};}
function switchSettings(tab){
  state.activeSettings=tab;document.querySelectorAll("[data-settings-panel]").forEach(el=>{el.hidden=el.dataset.settingsPanel!==tab;});
  document.querySelectorAll("[data-settings-tab]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.settingsTab===tab)));
  clearInterval(state.jobsTimer);state.jobsTimer=null;
  if(tab==='cache'){loadCacheStats();}
  if(tab==="catalogue"){loadImportOptions();loadJobs();state.jobsTimer=setInterval(loadJobs,3500);}
}
async function openSettings(tab="reading"){
  try{state.prefs=await api("/api/settings");applyLanguage();fillSettings();switchSettings(tab);if(!$("settingsDialog").open)showPopup($("settingsDialog"),"settings");updateRepeatButton();}
  catch(error){showNotice("globalMessage",errorMessage(error));}
}
function closeSettings(){clearInterval(state.jobsTimer);state.jobsTimer=null;return closePopup($("settingsDialog"));}
async function testModel(){
  $("lmEnabled").checked=true;
  if(!await savePrefs(false))return;showNotice("modelTestResult",t("testingModel"));$("testModel").disabled=true;
  try{const result=await post("/api/settings/test-model");$("modelSuggestions").innerHTML=result.models.map(m=>'<option value="'+esc(m.id)+'"></option>').join("");
    if(!state.prefs.lm_model&&result.models.length){$("modelId").value=result.models[0].id;await savePrefs(false);}
    state.prefs=await api("/api/settings");showNotice("modelTestResult",result.models.length?t("modelConnected",{count:result.models.length}):t("noModels"));
  }catch(error){state.prefs=await api("/api/settings");showNotice("modelTestResult",errorMessage(error));}
  finally{$("testModel").disabled=false;}
}
async function loadImportOptions(){
  try{const options=await api("/api/discovery/options");$("wikiRootOptions").innerHTML=options.wiki_roots.map(r=>'<label class="checkbox-row"><input type="checkbox" name="wikiRoot" value="'+esc(r.id)+'" checked><span>'+esc(state.ui==="zh"?r.label_zh:r.label_en)+'</span></label>').join("");
    $("gbifFamilyOptions").innerHTML=options.gbif_families.map(f=>'<label class="checkbox-row"><input type="checkbox" name="gbifFamily" value="'+esc(f.id)+'" checked><span>'+esc(state.ui==="zh"?f.label_zh+" / "+f.label_en:f.label_en)+'</span></label>').join("");
    const stats=await api("/api/catalog/stats");$("managementStats").textContent=t("catalogueStats",stats);
  }catch(error){$("managementStats").textContent=errorMessage(error);}
}
async function loadJobs(){
  if(!$("settingsDialog").open&&state.activeSettings!=="catalogue")return;
  try{const data=await api("/api/jobs");$("importJobs").innerHTML=data.jobs.length?data.jobs.map(j=>'<div class="job-row"><strong>'+esc(j.kind.toUpperCase())+' · '+esc(t("status_"+j.status))+'</strong><span>'+esc(t("jobProgress",{progress:j.progress,current:j.current}))+(j.total?" / "+j.total:"")+'</span>'+(j.error?'<p>'+esc(j.error)+'</p>':"")+'<div>'+(j.status==="running"?'<button type="button" class="quiet-button" data-pause="'+esc(j.id)+'">'+esc(t("pause"))+'</button>':j.status!=="completed"?'<button type="button" class="quiet-button" data-resume="'+esc(j.id)+'">'+esc(t("resume"))+'</button>':"")+'</div></div>').join(""):esc(t("noJobs"));
    $("importJobs").querySelectorAll("[data-pause]").forEach(b=>b.addEventListener("click",async()=>{await post("/api/jobs/"+b.dataset.pause+"/pause");loadJobs();}));
    $("importJobs").querySelectorAll("[data-resume]").forEach(b=>b.addEventListener("click",async()=>{await post("/api/jobs/"+b.dataset.resume+"/resume",{max_categories:Number($("categoryBudget").value)});loadJobs();}));
    const stats=await api("/api/catalog/stats");$("managementStats").textContent=t("catalogueStats",stats);$("catalogStats").textContent=t("catalogueStats",stats);
  }catch(error){$("importJobs").textContent=errorMessage(error);}
}
async function startImport(kind){
  const selected=Array.from(document.querySelectorAll(kind==="wiki"?'input[name="wikiRoot"]:checked':'input[name="gbifFamily"]:checked')).map(el=>el.value);
  if(!selected.length){$("settingsMessage").textContent=t("chooseRoots");return;}
  const options=kind==="wiki"?{roots:selected,max_depth:Number($("importDepth").value),max_categories:Number($("categoryBudget").value)}:{families:selected};
  try{await post("/api/jobs",{kind,options});$("settingsMessage").textContent=t("importStarted");loadJobs();}catch(error){$("settingsMessage").textContent=errorMessage(error);}
}
async function remoteSearch(){
  const query=$("remoteQuery").value.trim();if(!query)return;$("remoteResults").textContent=t("onlineSearch");
  try{const data=await api("/api/discovery/search?q="+encodeURIComponent(query)+"&language="+state.ui);
    $("remoteResults").innerHTML=data.results.length?data.results.map((row,i)=>'<div class="remote-result"><strong>'+esc(row.title)+'</strong><small>'+esc(row.snippet.slice(0,180))+'</small><button type="button" class="quiet-button" data-import="'+i+'">'+esc(t("importRecord"))+'</button></div>').join(""):esc(t("nothingOnline"));
    $("remoteResults").querySelectorAll("button").forEach(button=>button.addEventListener("click",async()=>{button.disabled=true;try{const row=data.results[Number(button.dataset.import)];const result=await post("/api/discovery/import-page",{source:data.source,pageid:row.pageid,title:row.title});if(result.entry_id)act({type:"entry",id:result.entry_id});loadCatalogue();}catch(error){showNotice("globalMessage",errorMessage(error));}finally{button.disabled=false;}}));
  }catch(error){$("remoteResults").textContent=errorMessage(error);}
}

const languageOptions=[['zh','中文（全部） / All Chinese'],['zh-Hans','简体中文'],['zh-Hant','繁體中文'],['en','English'],['ja','日本語'],['ko','한국어'],['fr','Français'],['de','Deutsch'],['es','Español'],['pt','Português'],['it','Italiano'],['ru','Русский'],['ar','العربية'],['hi','हिन्दी'],['th','ไทย'],['vi','Tiếng Việt'],['id','Bahasa Indonesia']];
$('excludedLanguages').innerHTML=languageOptions.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('');
$('translationTarget').insertAdjacentHTML('beforeend',languageOptions.filter(([id])=>!['zh','zh-Hans','zh-Hant','en'].includes(id)).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join(''));
const basicFillSettings=fillSettings;
fillSettings=function(){basicFillSettings();const p=state.prefs;$('translationProvider').value=p.translation_provider||'local';$('lmEnabled').checked=!!p.lm_enabled;$('azureRegion').value=p.azure_region||'';$('historyOrder').value=p.history_order||'recent';
 refreshFontControls();$('defaultChineseNameStyle').value=p.name_chinese_style||'botanical';$('defaultWesternNameStyle').value=p.name_western_style||'book';$('startupMode').value=p.startup_mode||'resume';$('randomScope').value=p.random_scope||'culinary';$('animationLevel').value=String(p.animation_level??2);
 for(const option of $('excludedLanguages').options)option.selected=(p.excluded_languages||[]).includes(option.value);
 for(const [id,key,clear] of [['googleTranslateKey','google_translate_key','clearGoogleTranslateKey'],['azureTranslateKey','azure_translate_key','clearAzureTranslateKey']]){$(id).value='';$(id).placeholder=t(p['has_'+key]?'savedKey':'noSavedKey');$(clear).checked=false;}
};
const basicSettingsValue=settingsValue;
settingsValue=function(){return {...basicSettingsValue(),name_fonts:{...(state.prefs.name_fonts||{}),[settingsChineseFontLanguage()]:$('defaultChineseNameFont').value,en:$('defaultWesternNameFont').value},name_chinese_style:$('defaultChineseNameStyle').value,name_western_style:$('defaultWesternNameStyle').value,startup_mode:$('startupMode').value,random_scope:$('randomScope').value,animation_level:Number($('animationLevel').value),translation_provider:$('translationProvider').value,lm_enabled:$('lmEnabled').checked,excluded_languages:Array.from($('excludedLanguages').selectedOptions).map(x=>x.value),google_translate_key:$('googleTranslateKey').value,azure_translate_key:$('azureTranslateKey').value,azure_region:$('azureRegion').value,clear_google_translate_key:$('clearGoogleTranslateKey').checked,clear_azure_translate_key:$('clearAzureTranslateKey').checked,history_order:$('historyOrder').value};};
async function savePrefs(refreshView=true){$('settingsMessage').textContent=t('saving');try{state.prefs=await post('/api/settings',settingsValue());state.nameChineseStyle=null;state.nameWesternStyle=null;state.nameFonts={};renderSpecimen();applyLanguage();fillSettings();$('settingsMessage').textContent=t('saved');if(refreshView){await act({type:'reloadCurrent'});await Promise.all([loadTree(),loadCatalogue()]);}return true;}catch(error){$('settingsMessage').textContent=errorMessage(error);return false;}};
const basicSwitchSettings=switchSettings;
switchSettings=function(tab){basicSwitchSettings(tab);if(tab==='versions')loadVersions();if(tab==='collections')loadSavedList();if(tab==='logs')loadLogs(true);if(tab==='about')loadAbout();if(tab==='network')renderHealth();animateArrival(document.querySelector('[data-settings-panel="'+tab+'"]'));updateRepeatButton();};
async function runDiagnostics(){if(!await savePrefs(false))return;$('networkResults').textContent=t('diagnosing');try{await beginHealthCycle(true);}catch(error){$('networkResults').textContent=errorMessage(error);}};
const basicImportOptions=loadImportOptions;
loadImportOptions=async function(){await basicImportOptions();try{const stats=await api('/api/catalog/stats');$('databaseCutoff').textContent=metadataText(stats.metadata);}catch{}};
function appearance(dark){document.documentElement.dataset.appearance=dark?'dark':'light';$('appearance').textContent=dark?(state.ui==='zh'?(state.locale==='zh-Hant'?'淺色':'浅色'):'Light'):(state.ui==='zh'?'深色':'Dark');}

function viewSnapshot(){return {immersive:!!state.immersive,exploreReading:state.exploreReading||null,nameFonts:{...(state.nameFonts||{})},readingQuery:$('readingSearch').value,entry:state.id||'basil',form:state.form,source:state.source,wikiLocale:state.wikiLocale,sourceReadUrl:state.sourceReadUrl||null,imageProvider:state.imageProvider,imageProfile:state.imageProfile,query:$('search').value,scope:state.scope,node:state.node,path:state.path.map(p=>({...p})),offset:state.offset,group:state.group,collection:state.collection,mainScroll:$('main').scrollTop,catalogScroll:document.querySelector('.catalog').scrollTop,treeOffset:catalogNav.treeOffset,treeLimit:catalogNav.treeLimit,entryLimit:state.limit,treeScroll:$('catalogTreeViewport').scrollTop,entryScroll:$('catalogEntryViewport').scrollTop,windowScroll:window.scrollY||0,readerMode:state.mode,textMode:state.lang,typeStyle:$('typeStyle').value,nameChineseStyle:state.nameChineseStyle||state.prefs.name_chinese_style||'botanical',nameWesternStyle:state.nameWesternStyle||state.prefs.name_western_style||'book',frameOpen:!$('frameContainer').hidden,frameFit:state.frameMode==='scaled',frameMode:state.frameMode||'responsive',frameExpanded:!!state.frameExpanded,anchor:state.anchor||''};}
let viewTimer;function rememberView(){if(state.restoring||!state.id)return;clearTimeout(viewTimer);viewTimer=setTimeout(()=>post('/api/view-state',viewSnapshot()).catch(()=>{}),450);}
async function maybeReload(action,savePosition=true){if(!state.pendingHealth||state.restoring)return false;if(savePosition)saveJourneyPosition();persistRemoteContinuation();const snapshot=viewSnapshot();try{sessionStorage.setItem('atlas-reload',JSON.stringify({version:state.version,view:snapshot,action}));}catch{return false;}try{await post('/api/view-state',snapshot);}catch{}location.reload();return true;}
async function act(action){
 if(['scope','collection'].includes(action.type))catalogNav.treeOffset=0;
 if(typeof beginRemoteOperation==='function')beginRemoteOperation(action);
 if(['language','source','readerMode','textMode'].includes(action.type))beginInkChange(action.type==='language'?'language':'source');
 else if(action.type==='entry'){clearInkMotion();inkMotion.kind=null;}
 const inkGeneration=inkMotion.generation;
 if(await maybeReload(action))return;state.restoreEpoch=(state.restoreEpoch||0)+1;
 journey.restoring=false;const journeyToken=beginJourneyAction();
 switch(action.type){
 case 'readingMode':await setReadingMode(action.enabled);break;
 case 'nameFont':state.nameFonts={...(state.nameFonts||{}),[action.language]:action.font};renderSpecimen();break;
 case 'entry':state.anchor='';state.anchorPinned=false;$('main').scrollTop=0;window.scrollTo?.(0,0);await loadEntry(action.id,action.form);break;
 case 'home':await returnHome();break;
 case 'wikiLanguage':state.wikiLocale=action.language;state.source=action.language==='en'?'enwiki:en':'zhwiki:zh';await loadArticle();break;
 case 'readResult':await readWebResult(action.url);break;
 case 'form':state.form=action.form;applyForm();renderForms();await loadImages();break;
 case 'source':state.wikiLocale=null;state.source=action.source;state.requestedTextMode=null;await loadArticle();break;
 case 'imageProfile':state.imageProfile=action.profile;await loadImages();break;
 case 'provider':state.imageProvider=action.provider;await loadImages();break;
 case 'refreshArticle':if(state.sourceReadUrl)await readWebResult(state.sourceReadUrl,true);else await loadArticle(true);break;
 case 'refreshImages':await loadImages(true);break;
 case 'search':state.offset=0;await loadCatalogue();break;
 case 'treePage':catalogNav.treeOffset=Math.max(0,catalogNav.treeOffset+action.direction*catalogNav.treeLimit);rememberRepeat({kind:'treePage',direction:action.direction,label:action.direction>0?'treeNext':'treePrevious'});await loadTree();break;
 case 'page':if($(action.direction>0?'catalogNext':'catalogPrevious').disabled)break;rememberRepeat({kind:'page',direction:action.direction,label:action.direction>0?'catalogNextLabel':'catalogPreviousLabel'});state.offset=Math.max(0,state.offset+action.direction*state.limit);await loadCatalogue();break;
 case 'scope':state.scope=action.scope;state.node=null;state.path=[];state.group='all';state.offset=0;updateGroups();await Promise.all([loadTree(),loadCatalogue()]);break;
 case 'collection':state.collection=action.collection;state.node=null;state.path=[];state.offset=0;await Promise.all([loadTree(),loadCatalogue()]);break;
 case 'group':state.group=action.group;state.offset=0;updateGroups();await loadCatalogue();break;
 case 'browse':state.offset=0;updateGroups();await Promise.all([loadTree(),loadCatalogue()]);break;
 case 'readerMode':if(state.source==='other')break;state.mode=action.mode;state.lang='original';$('languageMode').value='original';renderArticle();break;
 case 'textMode':$('languageMode').value=action.mode;await setLanguage(!!action.refresh);break;
 case 'typeStyle':$('typeStyle').value=action.style;if(['botanical','scroll'].includes(action.style))state.nameChineseStyle=action.style;else state.nameWesternStyle=action.style;renderSpecimen();break;
 case 'nameChineseStyle':state.nameChineseStyle=action.style;renderSpecimen();break;
 case 'nameWesternStyle':state.nameWesternStyle=action.style;renderSpecimen();break;
 case 'language':await changeInterfaceLanguage(action.language);break;
 case 'reloadCurrent':await loadEntry(state.id,state.form,{source:state.source,imageProvider:state.imageProvider,imageProfile:state.imageProfile,textMode:state.lang});break;
 case 'closeFrame':await dismissSourceWindow();break;
 case 'frameMode':state.frameMode=action.mode;resizeSourceFrame();break;
 case 'frameExpand':await toggleSourceWindow(action.expanded);break;
 case 'anchor':{const target=$(action.anchor);if(target){state.anchor=action.anchor;state.anchorPinned=true;settleReadingAnchor();}break;}
 }
 if(inkGeneration===inkMotion.generation)inkMotion.kind=null;
 selectionFeedback(action);finishJourneyAction(journeyToken);rememberView();traceUiEvent(action.type,{entry:state.id,source:state.source,form:state.form,scope:state.scope,node:state.node||'',offset:state.offset,tree_offset:catalogNav.treeOffset});
}
function absorbAction(view,action){const value={...view};if(!action)return value;switch(action.type){case'readingMode':value.immersive=action.enabled;break;case'nameFont':value.nameFonts={...(value.nameFonts||{}),[action.language]:action.font};break;case'readResult':value.sourceReadUrl=action.url;break;case'home':Object.assign(value,homeView());break;case'wikiLanguage':value.sourceReadUrl=null;value.wikiLocale=action.language;value.source=action.language==='en'?'enwiki:en':'zhwiki:zh';break;case'entry':value.sourceReadUrl=null;value.wikiLocale=null;Object.assign(value,{entry:action.id,form:action.form,source:'auto',imageProvider:'commons',imageProfile:'auto',textMode:null,mainScroll:0,frameOpen:false,frameExpanded:false});break;case'form':value.form=action.form;break;case'source':value.sourceReadUrl=null;value.source=action.source;value.textMode=null;break;case'imageProfile':value.imageProfile=action.profile;break;case'provider':value.imageProvider=action.provider;value.frameOpen=action.provider!=='commons';break;case'frameMode':value.frameMode=action.mode;break;case'frameExpand':value.frameExpanded=action.expanded;break;case'closeFrame':value.frameOpen=false;value.frameExpanded=false;break;case'scope':Object.assign(value,{scope:action.scope,node:null,path:[],group:'all',offset:0});break;case'collection':Object.assign(value,{collection:action.collection,node:null,path:[],offset:0});break;case'group':Object.assign(value,{group:action.group,offset:0});break;case'page':value.offset=Math.max(0,(value.offset||0)+action.direction*state.limit);break;case'treePage':value.treeOffset=Math.max(0,(value.treeOffset||0)+action.direction*(value.treeLimit||catalogNav.treeLimit));break;case'search':case'browse':value.offset=0;break;case'readerMode':value.readerMode=action.mode;value.textMode='original';break;case'textMode':value.textMode=action.mode;break;case'typeStyle':value.typeStyle=action.style;if(['botanical','scroll'].includes(action.style))value.nameChineseStyle=action.style;else value.nameWesternStyle=action.style;break;case'nameChineseStyle':value.nameChineseStyle=action.style;break;case'nameWesternStyle':value.nameWesternStyle=action.style;break;}return value;}

function renderHealth(){const data=state.health;if(!data)return;$('networkResults').innerHTML='<p class="subtle-note">'+esc(data.checked_at?formatDate(data.checked_at):t('healthChecking'))+' · '+esc(data.budget_ms||2000)+' ms · 600 s · Parsley</p>'+Object.values(data.services||{}).map(row=>'<div class="diagnostic-row"><strong>'+esc(row.id)+'</strong><span>'+esc(row.status==='unconfirmed'||row.ok==null?t('serviceUnconfirmed'):row.ok?t('success'):t('serviceDisabled'))+'</span><small>'+esc(row.kind||'')+' · '+esc(row.http_status||row.message||'')+' · '+esc(t('backendRoute'))+': '+esc(row.backend_ok===true?'✓':row.backend_ok===false?'×':'—')+(row.browser_ok!==undefined?' · '+esc(t('browserRoute'))+': '+(row.browser_ok===true?'✓':row.browser_ok===false?'×':'—'):'')+(row.frame_restricted?' · '+esc(t('frameRestricted')):'')+'</small></div>').join('');}

function renderNotifications(){paintNotifications();}
let healthCycleTimer=0,healthFinishTimer=0,healthBrowserRound=null;
function scheduleHealthCycle(report){
 if(!Number.isFinite(report.next_check_in_ms)||report.paused||report.needs_retest)return;
 clearTimeout(healthCycleTimer);healthCycleTimer=setTimeout(()=>beginHealthCycle(),Math.max(1000,report.next_check_in_ms+20));
}
async function checkHealth(){try{
 const report=await api('/api/health'),first=state.healthRevision===null;state.health=report;
 if(report.phase==='ready'){
  if(first){state.healthRevision=report.revision;if(state.entry){const id=state.id,item=await api('/api/entry/'+encodeURIComponent(id)+'?browser_language='+encodeURIComponent(browserLanguage()));if(id===state.id){state.entry.sources=item.sources;state.entry.image_gateways=item.image_gateways;renderSources();const gateways=item.image_gateways||{};$('imageGateways').querySelectorAll('a').forEach(a=>{if(!Object.values(gateways).includes(a.getAttribute('href')))a.remove();});}}}
  else if(report.revision!==state.healthRevision)state.pendingHealth=true;
  scheduleHealthCycle(report);
 }
 renderNotifications();if(state.activeSettings==='network')renderHealth();
}catch{}}
async function browserHealth(plan=null){try{
 plan=plan||await api('/api/browser-plan/health');if(!plan.probes?.length)return;
 if(plan.round_id&&healthBrowserRound===plan.round_id)return;healthBrowserRound=plan.round_id;
 const budget=Math.min(2000,plan.remaining_ms??2000),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1,budget));
 try{await Promise.all(plan.probes.map(async probe=>{
  let ok=false;
  try{const response=await fetch(probe.url+'?'+new URLSearchParams(probe.params),{signal:controller.signal,credentials:'omit'});const data=await response.json();ok=response.ok&&!data.error;}catch{if(controller.signal.aborted)return;}
  if(!controller.signal.aborted)await post('/api/health/browser',{round_id:plan.round_id,results:[{id:probe.id,ok}]}).catch(()=>{});
 }));
 }finally{clearTimeout(timer);controller.abort();}
}catch{}}
async function beginHealthCycle(manual=false){
 try{const plan=await post(manual?'/api/settings/diagnostics':'/api/health/round');state.health={...state.health,...plan};renderHealth();
 browserHealth(plan);clearTimeout(healthFinishTimer);
 if(plan.phase==='checking'&&plan.remaining_ms>0)healthFinishTimer=setTimeout(()=>checkHealth(),plan.remaining_ms+50);
 else{await checkHealth();if(!plan.needs_retest)scheduleHealthCycle(plan);}
 return plan;
 }catch(error){if(manual)throw error;}
}

function reorderable(container,rows,save){let dragging=null;container.querySelectorAll('[data-order-id]').forEach(row=>{const key=row.dataset.orderId;row.draggable=true;row.addEventListener('dragstart',event=>{if(event.target.closest('input,button')&&!event.target.closest('.drag-handle')){event.preventDefault();return;}dragging=key;row.classList.add('dragging');event.dataTransfer?.setData('text/plain',key);});row.addEventListener('dragend',()=>{dragging=null;row.classList.remove('dragging');});row.addEventListener('dragover',event=>{event.preventDefault();row.classList.add('drag-over');});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));row.addEventListener('drop',async event=>{event.preventDefault();row.classList.remove('drag-over');const from=rows.indexOf(dragging),to=rows.indexOf(key);if(from<0||to<0||from===to)return;const next=[...rows];next.splice(to,0,next.splice(from,1)[0]);await save(next);});row.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',async()=>{const from=rows.indexOf(key),to=from+Number(b.dataset.move);if(to<0||to>=rows.length)return;const next=[...rows];[next[from],next[to]]=[next[to],next[from]];await save(next);}));});}
const orderArrows=()=>'<div class="order-controls"><button type="button" data-move="-1" title="'+esc(t('moveUp'))+'">↑</button><button type="button" data-move="1" title="'+esc(t('moveDown'))+'">↓</button></div>';
async function loadVersions(){const before=listPositions($('versionList'));try{const data=await api('/api/versions');state.versions=data;$('versionSort').value=data.sort;$('versionDirection').value=data.direction;$('sourceVersion').innerHTML=data.versions.map(v=>'<option value="'+esc(v.id)+'"'+(v.id===data.active?' selected':'')+'>'+esc(v.name)+'</option>').join('');$('versionList').innerHTML=data.versions.map(v=>'<div class="sortable-row" data-order-id="'+esc(v.id)+'"><span class="drag-handle" title="'+esc(t('customOrder'))+'">⠿</span><div class="row-details"><input data-version-name="'+esc(v.id)+'" value="'+esc(v.name)+'" maxlength="100" aria-label="'+esc(t('versionName'))+'"><small>'+esc(t('createdAt'))+' '+esc(formatDate(v.created_at))+' · '+esc(t('modifiedAt'))+' '+esc(formatDate(v.updated_at))+'</small>'+orderArrows()+'</div><div class="row-controls">'+(v.id===data.active?'<span class="health-pill">'+esc(t('active'))+'</span>':'<button type="button" data-version-action="switch">'+esc(t('switchVersion'))+'</button>')+'<button type="button" data-version-action="rename">'+esc(t('rename'))+'</button><button type="button" data-version-action="delete"'+(data.versions.length===1?' disabled':'')+'>'+esc(t('remove'))+'</button></div></div>').join('');animateListMove($('versionList'),before);reorderable($('versionList'),data.versions.map(v=>v.id),async order=>{await post('/api/versions/order',{order});loadVersions();});$('versionList').querySelectorAll('[data-version-action]').forEach(b=>b.addEventListener('click',async()=>{const row=b.closest('[data-order-id]');const action=b.dataset.versionAction;try{await post('/api/view-state',viewSnapshot());await post('/api/versions/'+row.dataset.orderId+'/'+action,{name:row.querySelector('input').value});if(action==='switch'||action==='delete'&&row.dataset.orderId===state.version){sessionStorage.removeItem('atlas-reload');location.reload();}else loadVersions();}catch(error){$('settingsMessage').textContent=errorMessage(error);}}));$('versionTrash').innerHTML=data.deleted.map(v=>'<div class="job-row">'+esc(v.name)+' · '+esc(formatDate(v.deleted_at))+' <button type="button" class="quiet-button" data-restore="'+esc(v.id)+'">'+esc(t('restore'))+'</button></div>').join('');$('versionTrash').querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',async()=>{await post('/api/versions/'+b.dataset.restore+'/restore');loadVersions();}));}catch(error){$('versionList').textContent=errorMessage(error);}}
async function loadSavedList(){const kind=$('savedCollection').value,before=listPositions($('savedList'));try{const data=await api('/api/collections/'+kind);const rows=data.rows.filter(row=>row.entry);$('savedList').innerHTML=rows.length?rows.map(row=>'<div class="sortable-row" data-order-id="'+esc(row.entry_id)+'"><span class="drag-handle">⠿</span><div class="row-details"><strong>'+esc(nameOf(row.entry))+'</strong><small>'+esc(formatDate(row.visited_at||row.added_at))+'</small>'+orderArrows()+'</div><div class="row-controls"><button type="button" data-open-entry="'+esc(row.entry_id)+'">'+esc(t('openSource'))+'</button>'+(kind==='favorites'?'<button type="button" data-remove-favorite="'+esc(row.entry_id)+'">'+esc(t('remove'))+'</button>':'')+'</div></div>').join(''):t('empty');animateListMove($('savedList'),before);reorderable($('savedList'),rows.map(r=>r.entry_id),async order=>{await post('/api/collections/'+kind+'/order',{order});if(kind==='history'){state.prefs=await post('/api/settings',{history_order:'custom'});$('historyOrder').value='custom';}await loadSavedList();if(state.collection===kind)loadCatalogue();});$('savedList').querySelectorAll('[data-open-entry]').forEach(b=>b.addEventListener('click',()=>{closeSettings();act({type:'entry',id:b.dataset.openEntry});}));$('savedList').querySelectorAll('[data-remove-favorite]').forEach(b=>b.addEventListener('click',async()=>{await post('/api/favorite/'+b.dataset.removeFavorite,{enabled:false});if(state.id===b.dataset.removeFavorite){state.entry.favorite=false;renderEntry();}loadSavedList();loadCatalogue();}));}catch(error){$('savedList').textContent=errorMessage(error);}}
let logBefore=null;async function loadLogs(reset=false){if(reset){logBefore=null;$('logList').innerHTML='';}try{const manager=$('logScope').value==='manager';const start=$('logList').querySelectorAll('.log-row').length;const data=await api('/api/logs?limit=60&manager='+manager+(logBefore?'&before='+logBefore:''));$('logList').insertAdjacentHTML('beforeend',data.rows.map(row=>'<article class="log-row"><time>'+esc(formatDate(row.at))+'</time><strong>'+esc(row.action)+'</strong><pre>'+esc(JSON.stringify(row.details,null,2))+'</pre></article>').join(''));revealNewRows($('logList'),start,'.log-row');logBefore=data.rows.at(-1)?.id||null;$('moreLogs').hidden=data.rows.length<60;}catch(error){$('logList').textContent=errorMessage(error);}}
let auditOffset=0;async function loadAudit(reset=false){if(reset){auditOffset=0;$('auditResults').innerHTML='';}try{const start=$('auditResults').querySelectorAll('.audit-row').length;const data=await api('/api/catalog/audit?offset='+auditOffset+'&limit=30');$('auditResults').insertAdjacentHTML('beforeend',data.rows.map(row=>'<details class="audit-row"><summary>'+esc(row.payload.name_zh||row.payload.name_en||row.id)+' · '+esc(row.status)+'</summary><p>'+esc(row.reason)+'</p><pre>'+esc(JSON.stringify(row.evidence,null,2))+'</pre></details>').join(''));revealNewRows($('auditResults'),start,'.audit-row');auditOffset+=data.rows.length;$('auditNext').hidden=auditOffset>=data.total;}catch(error){$('auditResults').textContent=errorMessage(error);}}
async function loadAbout(){try{const [stats,vocab]=await Promise.all([api('/api/catalog/stats'),api('/api/image-vocabulary')]);$('aboutStats').innerHTML='<p>'+esc(t('catalogueStats',stats))+'</p><p>'+esc(t('cleaningCounts',{excluded:stats.audit.excluded||stats.audit.rejected||0,pending:stats.audit.pending||0,merged:stats.audit.merged||0}))+'</p><p>'+esc(t('vocabStats',{materials:vocab.sampled_materials||0,queries:vocab.sampled_queries||0,profiles:Object.keys(vocab.profiles||{}).length}))+'</p><p class="subtle-note">'+esc(metadataText(stats.metadata))+'</p>';}catch(error){$('aboutStats').textContent=errorMessage(error);}}
function openHelp(key){$('helpTitle').textContent=t(({depth:'depth',budget:'categoryBudget',policy:'sourcePolicy',health:'serviceHelp',images:'imageVocabulary',versions:'versions',pronunciation:'pronunciationHelp',reading:'navigationHelp'})[key]);$('helpBody').textContent=t('help_'+key);showPopup($('helpDialog'),'help');}

$('homeLink').addEventListener('click',event=>{event.preventDefault();act({type:'home'});});$('activateWiki').addEventListener('click',()=>act({type:'wikiLanguage',language:$('wikiLanguage').value}));$('wikiLanguage').addEventListener('change',()=>act({type:'wikiLanguage',language:$('wikiLanguage').value}));
$('appearance').addEventListener('click',togglePalette);
$('uiLanguage').addEventListener('change',()=>act({type:'language',language:$('uiLanguage').value}));
let searchTimer;$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>act({type:'search'}),250);});
$('catalogScope').addEventListener('change',()=>act({type:'scope',scope:$('catalogScope').value}));$('collectionMode').addEventListener('change',()=>act({type:'collection',collection:$('collectionMode').value}));
$('catalogPrevious').addEventListener('click',()=>pageCommand(-1));$('catalogNext').addEventListener('click',()=>pageCommand(1));
$('groupFilters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>act({type:'group',group:b.dataset.group})));
$('typeStyle').addEventListener('change',()=>act({type:'typeStyle',style:$('typeStyle').value}));$('focusMode').addEventListener('click',()=>act({type:'readerMode',mode:'focus'}));$('fullMode').addEventListener('click',()=>act({type:'readerMode',mode:'full'}));
$('refreshArticle').addEventListener('click',()=>act({type:'refreshArticle'}));$('refreshImages').addEventListener('click',()=>act({type:'refreshImages'}));$('languageMode').addEventListener('change',()=>act({type:'textMode',mode:$('languageMode').value}));$('retranslate').addEventListener('click',()=>act({type:'textMode',mode:'bilingual',refresh:true}));
$('imageTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>act({type:'provider',provider:b.dataset.provider})));$('closeSourceFrame').addEventListener('click',()=>act({type:'closeFrame'}));
$('closeImage').addEventListener('click',()=>closePopup($('imageDialog')));$('imageDialog').addEventListener('click',event=>{if(event.target===$('imageDialog'))closePopup($('imageDialog'));});$('printPage').addEventListener('click',()=>{settleMotion();window.print();});
$('openSettings').addEventListener('click',()=>openSettings());$('openVersions').addEventListener('click',()=>openSettings('versions'));$('manageCatalogue')?.addEventListener('click',()=>openSettings('catalogue'));$('closeSettings').addEventListener('click',closeSettings);$('settingsDialog').addEventListener('close',()=>clearInterval(state.jobsTimer));document.querySelectorAll('[data-settings-tab]').forEach(b=>b.addEventListener('click',()=>switchSettings(b.dataset.settingsTab)));
$('saveSettings').addEventListener('click',()=>savePrefs());$('testModel').addEventListener('click',testModel);$('runDiagnostics').addEventListener('click',runDiagnostics);$('importWiki').addEventListener('click',()=>startImport('wiki'));$('importGbif').addEventListener('click',()=>startImport('gbif'));$('remoteSearch').addEventListener('click',remoteSearch);$('loadAudit').addEventListener('click',()=>loadAudit(true));$('auditNext').addEventListener('click',()=>{rememberRepeat({kind:'audit',label:'auditNextLabel'});repeatLastAction();});
document.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>openHelp(b.dataset.help)));$('closeHelp').addEventListener('click',()=>closePopup($('helpDialog')));
$('favoriteEntry').addEventListener('click',async()=>{if(!state.entry)return;await post('/api/favorite/'+encodeURIComponent(state.id),{enabled:!state.entry.favorite});state.entry.favorite=!state.entry.favorite;renderEntry();motionEffect($('favoriteEntry'),[{transform:'scale(.94)'},{transform:'scale(1.035)'},{transform:'none'}],motionLevel()?220:0);if(state.collection==='favorites')loadCatalogue();});
$('savedCollection').addEventListener('change',loadSavedList);$('historyOrder').addEventListener('change',async()=>{state.prefs=await post('/api/settings',{history_order:$('historyOrder').value});loadSavedList();if(state.collection==='history')loadCatalogue();});$('reloadLogs').addEventListener('click',()=>loadLogs(true));$('logScope').addEventListener('change',()=>loadLogs(true));$('moreLogs').addEventListener('click',()=>{rememberRepeat({kind:'logs',label:'logsNextLabel'});repeatLastAction();});
$('createVersion').addEventListener('click',async()=>{try{await post('/api/view-state',viewSnapshot());await post('/api/versions',{name:$('newVersionName').value,mode:$('newVersionMode').value,source_id:$('sourceVersion').value});$('newVersionName').value='';loadVersions();}catch(error){$('settingsMessage').textContent=errorMessage(error);}});
for(const id of ['versionSort','versionDirection'])$(id).addEventListener('change',async()=>{await post('/api/versions/order',{sort:$('versionSort').value,direction:$('versionDirection').value});loadVersions();});
$('main').addEventListener('scroll',()=>{saveJourneyPosition();rememberView();},{passive:true});document.querySelector('.catalog').addEventListener('scroll',()=>{saveJourneyPosition();rememberView();},{passive:true});
for(const event of ['wheel','pointerdown','keydown','touchmove'])document.addEventListener(event,()=>{state.anchorPinned=false;if(state.restoring){state.restoreCancelled=true;state.restoreEpoch=(state.restoreEpoch||0)+1;}},{passive:true});

setupExperience();setupNameplates();setupCatalogueLayout();setupBrowserSources();setupResourceCache();setupFontCatalogue();setupReadingMode();
(async()=>{
 state.restoring=true;state.restoreCancelled=false;const restoreEpoch=state.restoreEpoch||0;
 try{const versions=await api('/api/versions');state.version=versions.active;restoreRepeatCommand();state.prefs=await api('/api/settings');state.vocabulary=await api('/api/image-vocabulary');applyLanguage();await beginHealthCycle();await checkHealth();let saved=await api('/api/view-state'),pending=null;
 try{const raw=sessionStorage.getItem('atlas-reload');sessionStorage.removeItem('atlas-reload');if(raw){const parsed=JSON.parse(raw);if(parsed.version===state.version){saved=parsed.view;pending=parsed.action;}}}catch{}
 if(pending?.type==='language'){state.prefs=await post('/api/settings',{ui_language:pending.language});applyLanguage();}
 const params=new URLSearchParams(location.search);let view=pending?.type==='restoreView'?pending.view:absorbAction(saved,pending);
 const explicitEntry=!pending&&params.get('entry')&&history.state?.atlasVersion!==state.version;let preserveJourney=!!pending||(state.prefs.startup_mode||'resume')==='resume';
 if(explicitEntry)view={...view,entry:params.get('entry'),form:params.get('form')||view.form,sourceReadUrl:null};
 else if(!pending&&state.prefs.startup_mode==='basil'){view={...view,entry:'basil',form:null,source:'auto',imageProvider:'commons',imageProfile:'auto',mainScroll:0,windowScroll:0,textMode:'original',frameOpen:false};preserveJourney=false;}
 else if(!pending&&state.prefs.startup_mode==='random'){try{const random=await api('/api/catalog/random');view={...view,entry:random.id,form:null,source:'auto',imageProvider:'commons',imageProfile:'auto',mainScroll:0,windowScroll:0,textMode:'original',frameOpen:false};preserveJourney=false;}catch{view={...view,entry:'basil'};}}
 state.immersive=!!view.immersive;state.exploreReading=view.exploreReading||null;state.nameFonts=view.nameFonts||{};$('readingSearch').value=view.readingQuery||'';applyReadingChrome();state.nameChineseStyle=view.nameChineseStyle||null;state.nameWesternStyle=view.nameWesternStyle||null;state.scope=['all','culinary','botanical'].includes(view.scope)?view.scope:'all';state.collection=view.collection||'catalogue';state.node=view.node||null;state.path=view.path||[];catalogNav.treeOffset=view.treeOffset||0;state.offset=view.offset||0;state.group=view.group||'all';state.mode=view.readerMode||'focus';$('typeStyle').value=view.typeStyle||'botanical';$('search').value=view.query||'';$('catalogScope').value=state.scope;$('collectionMode').value=state.collection;updateGroups();
 state.frameMode=view.frameMode||'responsive';state.frameExpanded=false;state.anchor=view.anchor||'';const entryId=view.entry||'basil';await Promise.all([loadTree(),loadCatalogue(),loadEntry(entryId,view.form,{source:view.source,wikiLocale:view.wikiLocale,imageProvider:view.imageProvider,imageProfile:view.imageProfile,textMode:view.textMode})]);
 if(!state.immersive&&view.sourceReadUrl&&!state.restoreCancelled&&(state.restoreEpoch||0)===restoreEpoch)await readWebResult(view.sourceReadUrl);
 if(view.frameOpen&&$('frameContainer').hidden&&state.imageProvider!=='commons')await openFrame();if(view.frameOpen===false)closeFrame();if(pending&&view.frameExpanded&&!$('frameContainer').hidden)await toggleSourceWindow(true);
 if(!state.restoreCancelled&&(state.restoreEpoch||0)===restoreEpoch){$('main').scrollTop=view.mainScroll||0;document.querySelector('.catalog').scrollTop=view.catalogScroll||0;requestAnimationFrame(()=>{if(!state.restoreCancelled){$('main').scrollTop=view.mainScroll||0;document.querySelector('.catalog').scrollTop=view.catalogScroll||0;}});}
 window.scrollTo?.(0,view.windowScroll||0);if(pending?.type==='anchor'&&$(pending.anchor)){state.anchor=pending.anchor;$(pending.anchor).scrollIntoView?.({behavior:'instant',block:'start'});}state.restoring=false;initJourney(preserveJourney,!!pending);if(pending?.type==='page')rememberRepeat({kind:'page',direction:pending.direction,label:pending.direction>0?'catalogNextLabel':'catalogPreviousLabel'});if(pending?.type==='restoreView'&&Number.isInteger(pending.journeyIndex)){journey.index=Math.min(pending.journeyIndex,journey.rows.length-1);journey.rows[journey.index]={...viewSnapshot(),navId:journey.rows[journey.index]?.navId||newNavId()};persistJourney();updateJourneyButtons();replaceJourneyURL();}else if(pending)finishJourneyAction(++journey.token);if(pending?.type==='textMode'&&pending.refresh)await act(pending);rememberView();setInterval(checkHealth,5000);
 }catch(error){state.restoring=false;state.bootstrapPaused=!!error.paused;showNotice('globalMessage',errorMessage(error));}
})();

function renderImageProfiles(){const profiles=state.vocabulary?.profiles||{};$('imageProfile').innerHTML='<option value="auto">'+esc(t('followForm'))+'</option>'+Object.entries(profiles).map(([id,p])=>'<option value="'+id+'">'+esc(state.ui==='en'?p.en:state.locale==='zh-Hant'?(p.zh_hant||p.zh):p.zh)+'</option>').join('');$('imageProfile').value=state.imageProfile||'auto';}
$('imageProfile').addEventListener('change',()=>act({type:'imageProfile',profile:$('imageProfile').value}));

function metadataText(meta={}){return [[t('sourceCutoff'),meta.source_cutoff],[t('cleanedAt'),meta.cleaned_at],[t('lastSync'),meta.last_sync_at]].filter(([,value])=>value).map(([label,value])=>label+': '+formatDate(value)).concat(meta.name_audit?[t('nameAuditCoverage',{zh:meta.name_audit.chinese_available,missing:meta.name_audit.chinese_missing})]:[]).join(' · ');}
