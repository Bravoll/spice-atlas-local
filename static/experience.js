"use strict";
/* Reading comfort, compositor motion and tab-local operation navigation. */
const motionQuery=window.matchMedia?.("(prefers-reduced-motion: reduce)");
const readerDefaults={reader_font_size:17,reader_line_height:1.85,reader_font:"serif",reader_font_family:"",animation_level:2};
let readerDraft=null,drawerSaving=false,paletteTransition=null,bloomTimer,paletteRevision=0,paletteSave=Promise.resolve(),bloomRevision=0,bloomEffect=null;
const arrivals=new WeakMap();
const ownedAnimations=new Set();
function trackMotion(animation){ownedAnimations.add(animation);animation.finished?.then(()=>ownedAnimations.delete(animation),()=>ownedAnimations.delete(animation));return animation;}
const journey={rows:[],index:-1,token:0,restoring:false,nativeBoundary:0};

function motionLevel(value=readerDraft||state.prefs){return motionQuery?.matches?0:Number(value.animation_level??2);}
function applyReadingPreferences(value=readerDraft||state.prefs){
 const root=document.documentElement;
 root.style.setProperty("--reader-size",Number(value.reader_font_size||17)+"px");
 root.style.setProperty("--reader-leading",String(value.reader_line_height||1.85));
 if(value.reader_font_family)root.style.setProperty("--custom-reader-family",cssFontFamily(value.reader_font_family));else root.style.removeProperty("--custom-reader-family");
 root.dataset.readerFont=value.reader_font||"serif";root.dataset.motion=String(motionLevel(value));
 if(!motionLevel(value)){for(const effect of ownedAnimations)effect.cancel();ownedAnimations.clear();paletteTransition?.skipTransition?.();$("themeBloom")?.classList.remove("blooming");if(typeof clearInkMotion==='function'){clearInkMotion();inkMotion.kind=null;}}
}
function animateArrival(element,kind="content"){
 const level=motionLevel();if(!element||!level||!element.animate||$("readingDrawer").open)return;
 arrivals.get(element)?.cancel();
 const animation=trackMotion(element.animate([{opacity:0,transform:level===1?"none":`translateY(${kind==="image"?12:7}px)`},{opacity:1,transform:"none"}],{duration:[0,110,260,440][level],easing:"cubic-bezier(.18,.75,.2,1)"}));
 arrivals.set(element,animation);
}
function updateExperienceLabels(){
 $("openReadingDrawer").title=t("readingComfort");$("refreshImages").title=t("refreshImages");$("refreshImages").setAttribute("aria-label",t("refreshImages"));
 $("fitSourceFrame").textContent=t(state.frameMode==='scaled'?"scaledWindow":"responsiveWindow");
 $("fitSourceFrame").setAttribute("aria-pressed",String(state.frameMode==='scaled'));
 $('expandSourceFrame').textContent=t(state.frameExpanded?'collapseWindow':'expandWindow');
 $('imagePrevious').setAttribute('aria-label',t('imagePreviousLabel'));$('imageNext').setAttribute('aria-label',t('imageNextLabel'));$('closeImage').setAttribute('aria-label',t('close'));
 updateJourneyButtons();updateRepeatButton();renderPronunciation();applyReadingPreferences();scheduleNavigator();
}
function fillReaderDrawer(){
 const p=readerDraft||state.prefs;
 $("readerSize").value=String(p.reader_font_size||17);$("readerHeight").value=String(p.reader_line_height||1.85);$("quickMotion").value=String(p.animation_level??2);
 $("readerSizeValue").textContent=Number(p.reader_font_size||17)+" px";$("readerHeightValue").textContent=Number(p.reader_line_height||1.85).toFixed(2);
 document.querySelectorAll("[data-size]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.size)===Number(p.reader_font_size))));
 document.querySelectorAll("[data-font]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.font===p.reader_font)));
 fillFontSelect($("readerFontFamily"),p.reader_font_family||'');applyReadingPreferences(p);
}
function openReaderDrawer(){
 if($("readingDrawer").open)return;
 readerDraft=Object.fromEntries(Object.keys(readerDefaults).map(k=>[k,state.prefs[k]??readerDefaults[k]]));
 $("readingSaveStatus").textContent="";fillReaderDrawer();$("openReadingDrawer").setAttribute("aria-expanded","true");showPopup($("readingDrawer"),'drawer',$("openReadingDrawer"));updateRepeatButton();
}
async function closeReaderDrawer(){
 if(drawerSaving||!$("readingDrawer").open)return;drawerSaving=true;$("readingSaveStatus").textContent=t("saving");
 try{
  const patch={...readerDraft};state.prefs=await post("/api/settings",patch);readerDraft=null;applyReadingPreferences();$("animationLevel").value=String(state.prefs.animation_level??2);
  await closePopup($("readingDrawer"));$("openReadingDrawer").setAttribute("aria-expanded","false");$("readingSaveStatus").textContent="";
 }catch(error){$("readingSaveStatus").textContent=errorMessage(error);}finally{drawerSaving=false;}
}
function changeReaderDraft(patch){if(!readerDraft)return;Object.assign(readerDraft,patch);fillReaderDrawer();}

async function togglePalette(event){
 const old=state.prefs.appearance||"light",next=old==="dark"?"light":"dark",revision=++paletteRevision;
 state.prefs.appearance=next;setPalette(next==="dark",event,true);
 paletteSave=paletteSave.catch(()=>{}).then(()=>post("/api/settings",{appearance:next}));
 try{const result=await paletteSave;if(revision===paletteRevision)state.prefs={...state.prefs,appearance:result.appearance};}
 catch(error){if(revision===paletteRevision){state.prefs.appearance=old;setPalette(old==="dark",null,false);showNotice("globalMessage",errorMessage(error));}}
}
function setPalette(dark,event,animate=false){
 const root=document.documentElement,level=motionLevel(),revision=++bloomRevision;bloomEffect?.cancel();bloomEffect=null;paletteTransition?.skipTransition?.();paletteTransition=null;
 // Apply in this input task: no full-document snapshot or delayed update callback.
 appearance(dark);delete root.dataset.paletteTransition;delete root.dataset.paletteDirection;
 const bloom=$("themeBloom");bloom.getAnimations?.().forEach(effect=>effect.cancel());bloom.classList.remove('blooming');clearTimeout(bloomTimer);
 if(!animate||!level)return;
 const rect=$("appearance").getBoundingClientRect();root.style.setProperty("--bloom-x",(event?.clientX||rect.left+rect.width/2)+"px");root.style.setProperty("--bloom-y",(event?.clientY||rect.top+rect.height/2)+"px");
 if(level===3){bloom.classList.add('blooming');const effect=bloomEffect=motionEffect(bloom,[{opacity:.28,transform:'scale(.72)'},{opacity:0,transform:'scale(1.08)'}],360);const done=()=>{if(revision===bloomRevision)bloom.classList.remove('blooming');};if(effect)effect.finished.then(done,done);else done();}
}

function resizeSourceFrame(){
 if($("frameContainer").hidden)return;
 const viewport=$("frameViewport"),frame=$("sourceFrame"),width=viewport.clientWidth;if(!width)return;
 const expanded=$('frameContainer').dataset.expanded==='true';
 const height=expanded?(viewport.style.removeProperty('height'),viewport.clientHeight||window.innerHeight-120):Math.round(Math.max(260,Math.min(680,($('main').clientHeight||window.innerHeight)*.76)));
 const scaled=state.frameMode==='scaled',layoutWidth=scaled?Math.max(width,window.innerWidth||document.documentElement.clientWidth||width):width,scale=width/layoutWidth;
 if(!expanded)viewport.style.height=height+"px";frame.style.width=layoutWidth+"px";frame.style.height=Math.ceil(height/scale)+"px";
 frame.style.transform=`scale(${scale})`;viewport.dataset.scale=scale.toFixed(4);
 $("fitSourceFrame").textContent=t(scaled?"scaledWindow":"responsiveWindow");$("fitSourceFrame").setAttribute("aria-pressed",String(scaled));
}
function settleReadingAnchor(){if(state.anchorPinned&&state.anchor){const node=$(state.anchor);(node?.closest?.('h2,h3,h4,h5,h6')||node)?.scrollIntoView?.({behavior:'instant',block:'start'});}}

/* The navigation journal contains safe UI state only, never model or service settings. */
const journeyKey=()=>"atlas-journey:"+state.version;
const viewSignature=view=>JSON.stringify(Object.fromEntries(Object.entries(view).filter(([k])=>!["mainScroll","catalogScroll","treeScroll","entryScroll","entryLimit","treeLimit","windowScroll","navId"].includes(k))));
const newNavId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
function persistJourney(){try{sessionStorage.setItem(journeyKey(),JSON.stringify({rows:journey.rows,index:journey.index,nativeBoundary:journey.nativeBoundary}));}catch{}}
function updateJourneyButtons(){$("goBack").disabled=journey.restoring||journey.index<=0;$("goForward").disabled=journey.restoring||journey.index>=journey.rows.length-1;}
function initJourney(preserve=false,deferCurrent=false){
 let saved=null;try{saved=JSON.parse(sessionStorage.getItem(journeyKey())||"null");}catch{}
 if(preserve&&Array.isArray(saved?.rows)&&saved.rows.length<=60&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<saved.rows.length){journey.rows=saved.rows;journey.index=saved.index;if(!deferCurrent)journey.rows[journey.index]={...viewSnapshot(),navId:journey.rows[journey.index].navId||newNavId()};}
 else{journey.rows=[{...viewSnapshot(),navId:newNavId()}];journey.index=0;}
 journey.nativeBoundary=history.state?.atlasVersion===state.version&&history.state.atlasJourneyId===journey.rows[journey.index]?.navId&&Number.isInteger(saved?.nativeBoundary)?saved.nativeBoundary:journey.index;
 persistJourney();updateJourneyButtons();if(!deferCurrent)replaceJourneyURL();
}
function replaceJourneyURL(push=false){
 const url=new URL(location.href);url.searchParams.set("entry",state.id);url.searchParams.set("form",state.form||"");url.hash="";
 const value={atlasVersion:state.version,atlasJourneyId:journey.rows[journey.index]?.navId,atlasView:viewSnapshot()};
 if(push&&history.pushState)history.pushState(value,"",url);else history.replaceState(value,"",url);
}
function beginJourneyAction(){
 if(journey.restoring||state.restoring||journey.index<0)return ++journey.token;
 const row=journey.rows[journey.index];Object.assign(row,{mainScroll:$("main").scrollTop,catalogScroll:document.querySelector(".catalog").scrollTop,windowScroll:window.scrollY||0,treeScroll:$('catalogTreeViewport').scrollTop,entryScroll:$('catalogEntryViewport').scrollTop});
 persistJourney();return ++journey.token;
}
function finishJourneyAction(token){
 if(token!==journey.token||journey.restoring||state.restoring||journey.index<0)return;
 const view=viewSnapshot(),last=journey.rows[journey.index];
 if(viewSignature(view)!==viewSignature(last)){
  if(journey.nativeBoundary>journey.index)journey.nativeBoundary=journey.index;
  journey.rows=journey.rows.slice(0,journey.index+1);journey.rows.push({...view,navId:newNavId()});
  if(journey.rows.length>60){journey.rows.shift();journey.nativeBoundary=Math.max(0,journey.nativeBoundary-1);}journey.index=journey.rows.length-1;replaceJourneyURL(true);
 }else{journey.rows[journey.index]={...view,navId:last.navId};replaceJourneyURL();}
 persistJourney();updateJourneyButtons();
}
function saveJourneyPosition(){
 if(journey.index<0||journey.restoring||state.restoring)return;
 Object.assign(journey.rows[journey.index],{mainScroll:$("main").scrollTop,catalogScroll:document.querySelector(".catalog").scrollTop,windowScroll:window.scrollY||0,treeScroll:$('catalogTreeViewport').scrollTop,entryScroll:$('catalogEntryViewport').scrollTop});scheduleJourneyPersist();
}
async function restoreReadingView(view){
 const token=++journey.token;journey.restoring=true;state.anchorPinned=false;updateJourneyButtons();state.restoreEpoch=(state.restoreEpoch||0)+1;
 const modeChanged=!!state.immersive!==!!view.immersive;state.immersive=!!view.immersive;state.exploreReading=view.exploreReading||null;state.nameFonts=view.nameFonts||{};$('readingSearch').value=view.readingQuery||'';if(modeChanged)cancelReadingRequests();applyReadingChrome();state.wikiLocale=view.wikiLocale||null;state.nameChineseStyle=view.nameChineseStyle||null;state.nameWesternStyle=view.nameWesternStyle||null;
 const previous={entry:state.id,form:state.form,source:state.source,provider:state.imageProvider,profile:state.imageProfile,sourceReadUrl:state.sourceReadUrl};
 const reuse=!modeChanged&&!!state.entry&&previous.entry===view.entry;
 try{
  state.scope=view.scope||"all";state.collection=view.collection||"catalogue";state.node=view.node||null;state.path=view.path||[];catalogNav.treeOffset=view.treeOffset||0;state.offset=view.offset||0;state.group=view.group||"all";state.mode=view.readerMode||"focus";state.frameMode=view.frameMode||'responsive';state.anchor=view.anchor||"";
  $("search").value=view.query||"";$("catalogScope").value=state.scope;$("collectionMode").value=state.collection;$("typeStyle").value=view.typeStyle||"botanical";updateGroups();
  const local=[loadTree(),loadCatalogue()];
  if(!reuse)local.push(loadEntry(view.entry||"basil",view.form,{source:view.source,wikiLocale:view.wikiLocale,imageProvider:view.imageProvider,imageProfile:view.imageProfile,textMode:view.textMode}));
  else{
   state.form=state.entry.forms.some(f=>f.id===view.form)?view.form:state.entry.forms[0].id;
   state.source=view.source==='auto'||state.entry.sources.some(s=>s.key===view.source)?view.source:'auto';
   state.imageProvider=state.entry.image_gateways?.[view.imageProvider]?view.imageProvider:Object.keys(state.entry.image_gateways||{}).find(k=>k!=='query')||'commons';state.imageProfile=view.imageProfile||'auto';
   renderEntry();renderSources();
   if(!state.immersive&&view.sourceReadUrl){local.push(readWebResult(view.sourceReadUrl));}
   else if(state.source!==previous.source||previous.sourceReadUrl||!state.article){state.requestedTextMode=view.textMode||'original';local.push(loadArticle());}
   else{state.lang=view.textMode||'original';$('languageMode').value=state.lang;if(state.lang!=='original'&&!state.translation)local.push(setLanguage());else renderArticle();}
   if(state.form!==previous.form||state.imageProvider!==previous.provider||state.imageProfile!==previous.profile)local.push(loadImages());
  }
  await Promise.all(local);
  if(!state.immersive&&!reuse&&view.sourceReadUrl)await readWebResult(view.sourceReadUrl);
  if(token!==journey.token)return;
  if(view.frameOpen&&$("frameContainer").hidden&&state.imageProvider!=="commons")await openFrame();
  if(!view.frameOpen)closeFrame();
  if(view.frameOpen&&view.frameExpanded)await toggleSourceWindow(true);else if(!view.frameExpanded&&$('frameContainer').dataset.expanded==='true')await toggleSourceWindow(false);resizeSourceFrame();
  if(token!==journey.token)return;
  $("main").scrollTop=view.mainScroll||0;document.querySelector(".catalog").scrollTop=view.catalogScroll||0;$("catalogTreeViewport").scrollTop=view.treeScroll||0;$("catalogEntryViewport").scrollTop=view.entryScroll||0;window.scrollTo?.(0,view.windowScroll||0);
  requestAnimationFrame(()=>{if(token===journey.token){$("main").scrollTop=view.mainScroll||0;document.querySelector(".catalog").scrollTop=view.catalogScroll||0;$("catalogTreeViewport").scrollTop=view.treeScroll||0;$("catalogEntryViewport").scrollTop=view.entryScroll||0;}});
 }finally{if(token===journey.token){journey.restoring=false;persistJourney();updateJourneyButtons();rememberView();}}
}
async function travelJourney(direction){
 if(journey.restoring)return;const index=journey.index+direction;if(index<0||index>=journey.rows.length)return;
 saveJourneyPosition();const view=journey.rows[index];
 if(index>=journey.nativeBoundary&&history.go&&history.state?.atlasVersion===state.version&&history.state.atlasJourneyId===journey.rows[journey.index]?.navId){history.go(direction);return;}
 if(await maybeReload({type:"restoreView",view,journeyIndex:index}))return;
 journey.nativeBoundary=100000;journey.index=index;await restoreReadingView(view);replaceJourneyURL();
}
async function randomExplore(){
 $("randomEntry").disabled=true;
 try{const value=await api("/api/catalog/random?exclude="+encodeURIComponent(state.id));await act({type:"entry",id:value.id});rememberRepeat({kind:'random',label:'randomExplore'});}
 catch(error){showNotice("globalMessage",errorMessage(error));}finally{$("randomEntry").disabled=false;}
}

let pronunciationEpoch=0,playingAudio=null,speechToken=0;
function stopPronunciation(){speechToken++;if(playingAudio){playingAudio.pause();playingAudio=null;}window.speechSynthesis?.cancel();}
function renderPronunciation(){
 const entry=state.entry;if(!entry)return;const info=state.pronunciation||{},word=entry.spoken_english;
 const variant=(info.variants||[]).find(v=>v.ipa);const pinyin=entry.pinyin||info.pinyin||"";
 $("pronunciation").innerHTML=(word?'<div class="pronunciation-line"><button type="button" class="speak-button" id="speakEnglish"><span aria-hidden="true">◖))</span><span>'+esc(t("listenEnglish"))+'</span></button>'+(variant?'<span class="ipa">'+esc(variant.ipa)+'</span><span class="pronunciation-region">'+esc(variant.region||"IPA")+'</span>':'<span class="pronunciation-note">'+esc(t("ipaUnavailable"))+'</span>')+'</div>':"")+(pinyin?'<div class="pinyin-line"><span class="pinyin">'+esc(pinyin)+'</span><small title="'+esc(t("pinyinNote"))+'">'+esc(t("pinyinAuto"))+'</small></div>':"")+(info.source_url&&variant?'<div class="pronunciation-credit">'+ext(info.source_url,t("pronunciationSource"))+'</div>':"")+'<span class="pronunciation-note" id="speechStatus" role="status"></span>';
 $("speakEnglish")?.addEventListener("click",playEnglish);
}
async function loadPronunciation(){
 const epoch=++pronunciationEpoch;state.pronunciation=null;stopPronunciation();renderPronunciation();
 if(!state.entry?.spoken_english)return;
 try{const value=await cachedResource({kind:'pronunciation',entry:state.id})||await api("/api/pronunciation/"+encodeURIComponent(state.id));if(epoch!==pronunciationEpoch)return;state.pronunciation=value;renderPronunciation();}catch{}
}
function browserEnglish(word,token){
 const synth=window.speechSynthesis;if(!synth||!window.SpeechSynthesisUtterance){$("speechStatus").textContent=t("speechUnavailable");return;}
 const voices=synth.getVoices(),voice=voices.find(v=>v.lang.toLowerCase()==="en-gb")||voices.find(v=>v.lang.toLowerCase().startsWith("en"));
 const utterance=new window.SpeechSynthesisUtterance(word);utterance.lang="en-GB";utterance.rate=.88;if(voice)utterance.voice=voice;
 $("speechStatus").textContent=t(voice?.lang.toLowerCase()==="en-gb"?"speechBritish":"speechSystem");
 utterance.onerror=()=>{if(token===speechToken)$("speechStatus").textContent=t("speechUnavailable");};
 utterance.onend=()=>{if(token===speechToken)$("speakEnglish")?.setAttribute("aria-pressed","false");};synth.speak(utterance);
}
async function playEnglish(){
 stopPronunciation();const token=speechToken,word=state.entry?.spoken_english;if(!word)return;
 $("speakEnglish")?.setAttribute("aria-pressed","true");
 const british=(state.pronunciation?.variants||[]).find(v=>v.region==="UK"&&v.audio_url);let fallbackStarted=false;
 const fallback=()=>{if(token===speechToken&&!fallbackStarted){fallbackStarted=true;browserEnglish(word,token);}};
 if(british&&window.Audio){
  try{const audio=new window.Audio(british.audio_url);playingAudio=audio;audio.onended=()=>{if(token===speechToken)$("speakEnglish")?.setAttribute("aria-pressed","false");};audio.onerror=fallback;await audio.play();if(token!==speechToken){audio.pause();return;}
   $("speechStatus").innerHTML=esc(t("speechRecording"))+" · "+ext(british.source_url,t("source"))+(british.license_url?" · "+ext(british.license_url,british.license||t("license")):"");return;
  }catch{if(token!==speechToken)return;}
 }
 fallback();
}

function setupExperience(){
 document.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#"]');if(!link)return;const anchor=link.getAttribute('href').slice(1);let target;try{target=document.getElementById(decodeURIComponent(anchor));}catch{}if(target){event.preventDefault();act({type:'anchor',anchor:target.id});}});
 $("openReadingDrawer").addEventListener("click",openReaderDrawer);$("settingsReadingTools").addEventListener("click",openReaderDrawer);$("closeReadingDrawer").addEventListener("click",closeReaderDrawer);
 $("readingDrawer").addEventListener("click",event=>{if(event.target===$("readingDrawer"))closeReaderDrawer();});$("readingDrawer").addEventListener("cancel",event=>{event.preventDefault();closeReaderDrawer();});
 $("readerSize").addEventListener("input",()=>changeReaderDraft({reader_font_size:Number($("readerSize").value)}));$("readerHeight").addEventListener("input",()=>changeReaderDraft({reader_line_height:Number($("readerHeight").value)}));$("quickMotion").addEventListener("change",()=>changeReaderDraft({animation_level:Number($("quickMotion").value)}));
 document.querySelectorAll("[data-size]").forEach(b=>b.addEventListener("click",()=>changeReaderDraft({reader_font_size:Number(b.dataset.size)})));document.querySelectorAll("[data-font]").forEach(b=>b.addEventListener("click",()=>changeReaderDraft({reader_font:b.dataset.font,reader_font_family:""})));
 $("resetReading").addEventListener("click",()=>changeReaderDraft(readerDefaults));
 $("goBack").addEventListener("click",()=>travelJourney(-1));$("goForward").addEventListener("click",()=>travelJourney(1));$("randomEntry").addEventListener("click",randomExplore);
 $("fitSourceFrame").addEventListener("click",()=>act({type:'frameMode',mode:state.frameMode==='scaled'?'responsive':'scaled'}));
 if(window.ResizeObserver)new window.ResizeObserver(resizeSourceFrame).observe($("frameViewport"));window.addEventListener("resize",resizeSourceFrame);
 window.addEventListener("scroll",()=>{saveJourneyPosition();rememberView();},{passive:true});
 window.addEventListener("popstate",event=>{const v=event.state;if(v?.atlasVersion!==state.version||!v.atlasView)return;saveJourneyPosition();const index=journey.rows.findIndex(row=>row.navId===v.atlasJourneyId);if(index>=0)journey.index=index;else{journey.rows=[{...v.atlasView,navId:v.atlasJourneyId||newNavId()}];journey.index=0;}persistJourney();if(state.pendingHealth){maybeReload({type:'restoreView',view:{...journey.rows[journey.index]},journeyIndex:journey.index},false);}else restoreReadingView(journey.rows[journey.index]);});
 motionQuery?.addEventListener?.("change",()=>{applyReadingPreferences();paletteTransition?.skipTransition?.();$("themeBloom").classList.remove("blooming");});
 window.addEventListener("pagehide",()=>{saveJourneyPosition();persistJourney();stopPronunciation();});setupInteractions();
}
