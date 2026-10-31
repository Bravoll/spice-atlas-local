"use strict";
/* Immersive mode reuses the reader, but owns its Wiki/Commons request generation. */
const readingContext={generation:0,controller:null,phase:'idle',outline:[],pinned:null,raf:0,searchEpoch:0,searchTimer:null};
function cancelReadingRequests(){readingContext.searchEpoch++;$('readingSearchResults').hidden=true;readingContext.generation++;readingContext.controller?.abort();readingContext.controller=null;readingContext.outline=[];readingContext.pinned=null;}
function applyReadingChrome(){
 document.body.dataset.reading=String(!!state.immersive);$('toggleReadingMode').setAttribute('aria-pressed',String(!!state.immersive));$('toggleReadingMode').textContent=t(state.immersive?'exitReadingMode':'enterReadingMode');
 $('readingSearchRegion').hidden=!state.immersive;$('readingLoadStatus').hidden=!state.immersive||readingContext.phase!=='loading';$('readingRetry').hidden=!state.immersive||readingContext.phase!=='error';$('encyclopedia').dataset.readingPhase=readingContext.phase;
 $('readingLoadStatus').textContent=t('readingLoading');$('readingRetry').textContent=t('readingRetry');$('readingSearch').placeholder=t('searchPlaceholder');$('readingSearch').setAttribute('aria-label',t('searchLabel'));$('readingOutlineToggle').setAttribute('aria-label',t('chapters'));
 if(!state.immersive){$('readingImages').hidden=true;$('readingOutline').hidden=true;}updateOutlinePresentation();
}
function readingEntryStart(){cancelReadingRequests();if(!state.immersive)return;readingContext.phase='loading';$('readingImages').replaceChildren();$('readingImages').hidden=true;$('readingOutline').hidden=true;$('articleBody').textContent='';applyReadingChrome();}
async function setReadingMode(enabled){
 enabled=!!enabled;if(enabled===!!state.immersive)return;
 if(enabled)state.exploreReading={entry:state.id,source:state.source,sourceReadUrl:state.sourceReadUrl,readerMode:state.mode,textMode:state.lang,form:state.form,imageProvider:state.imageProvider,imageProfile:state.imageProfile,mainScroll:$('main').scrollTop,windowScroll:window.scrollY||0,frameOpen:!$('frameContainer').hidden,frameExpanded:!!state.frameExpanded,frameMode:state.frameMode||'responsive'};
 cancelReadingRequests();const transition=readingContext.generation;state.articleEpoch++;state.imageEpoch++;pausePrefetch();stopOtherSources(true);closeFrame();state.immersive=enabled;state.sourceReadUrl=null;
 if(enabled){state.mode='full';state.source='auto';state.imageProvider='commons';state.imageProfile='auto';readingContext.phase='loading';$('articleBody').textContent='';$('main').scrollTop=0;window.scrollTo?.(0,0);}
 else{const old=state.exploreReading||{},same=old.entry===state.id;state.source=same?(old.source||'auto'):'auto';state.mode=old.readerMode||'focus';state.imageProvider=old.imageProvider||'commons';state.imageProfile=old.imageProfile||'auto';if(same&&state.entry.forms.some(f=>f.id===old.form))state.form=old.form;state.requestedTextMode=same?old.textMode||'original':'original';state.frameMode=old.frameMode||'responsive';readingContext.phase='idle';}
 applyReadingChrome();renderForms();applyForm();renderSources();
 const restoreDetail=!enabled&&state.exploreReading?.entry===state.id&&state.exploreReading.sourceReadUrl;
 await Promise.allSettled([restoreDetail?readWebResult(restoreDetail):loadArticle(),loadImages()]);
 if(transition!==readingContext.generation||enabled!==!!state.immersive)return;
 if(!enabled&&state.exploreReading?.frameOpen===false)closeFrame();
 if(!enabled&&state.exploreReading?.frameOpen&&state.exploreReading.frameExpanded&&!$('frameContainer').hidden)await toggleSourceWindow(true);
 if(!enabled&&state.exploreReading?.entry===state.id){$('main').scrollTop=state.exploreReading.mainScroll||0;window.scrollTo?.(0,state.exploreReading.windowScroll||0);}
}
async function loadReadingArticle(refresh=false){
 const epoch=++state.articleEpoch,entryId=state.id,generation=readingContext.generation;readingContext.phase='loading';state.article=null;state.translation=null;state.lang='original';applyReadingChrome();
 const current=()=>state.immersive&&epoch===state.articleEpoch&&entryId===state.id&&generation===readingContext.generation;
 const preferred=wikiPreference();if(preferred.startsWith('zh')&&!wikiMapping().zh&&state.wikiReady)await state.wikiReady;if(!current())return;const mapping=wikiMapping(),first=preferred.startsWith('zh')&&mapping.zh?'zhwiki':'enwiki',sources=[...new Set([first,'enwiki'])];
 for(const source of sources){
  try{
   const lang=source==='zhwiki'?(preferred.startsWith('zh')?preferred:'zh-Hans'):'en';
   let article=await cachedResource({kind:'article',entry:entryId,source,preferred:lang,variant:lang},refresh);if(!current())return;
   if(!article)article=await api('/api/article/'+encodeURIComponent(entryId)+'?'+new URLSearchParams({source,preferred:lang,refresh:String(!!refresh),browser_language:browserLanguage()}));if(!current())return;
   if(article.mode!=='article'||!article.html?.trim())continue;
   readingContext.phase='ready';applyReadingChrome();await acceptArticle(article,epoch);if(current())updateReadingOutline();return;
  }catch{if(!current())return;try{const article=await browserArticleData(entryId,source);if(!current())return;if(article.mode==='article'&&article.html?.trim()){readingContext.phase='ready';applyReadingChrome();await acceptArticle(article,epoch);if(current())updateReadingOutline();return;}}catch{if(!current())return;}}
 }
 if(current()){readingContext.phase='error';$('articleBody').textContent='';$('sourceTitle').textContent='Wikipedia';$('sourceMeta').textContent='';$('articleCredit').textContent='';$('readerControls').hidden=true;applyReadingChrome();}
}
async function readingCommons(form,entryId,current,refresh,signal){
 const resource={kind:'images',entry:entryId,provider:'commons',form:form.id,profile:'auto'};let data=await cachedResource(resource,refresh);if(!current())return null;
 if(!data&&state.prefs.browser_images!==false){try{const plan=await api('/api/browser-plan/images/'+encodeURIComponent(entryId)+'?form='+encodeURIComponent(form.id)+'&profile=auto',{signal}),pages=[];
  for(const params of (plan.queries||[plan.params]).slice(0,3)){const raw=await directJSON(plan.url,params);if(!current())return null;pages.push(...(raw.query?.pages||[]));data=await post('/api/browser-ingest/images',{entry_id:entryId,form:form.id,profile:'auto',browser_language:browserLanguage(),data:{query:{pages:[...new Map(pages.map(p=>[p.pageid||p.title,p])).values()]}}});if(!current())return null;if(data.images?.length)break;}
 }catch{if(!current())return null;if(!data?.images?.length)data=null;}}
 if(!data)data=await api('/api/images/'+encodeURIComponent(entryId)+'?'+new URLSearchParams({provider:'commons',form:form.id,profile:'auto',refresh:String(!!refresh),browser_language:browserLanguage()}),{signal});return current()?data:null;
}
async function loadReadingImages(refresh=false){
 const entryId=state.id,epoch=++state.imageEpoch,generation=readingContext.generation,controller=new AbortController();readingContext.controller?.abort();readingContext.controller=controller;
 const current=()=>state.immersive&&entryId===state.id&&epoch===state.imageEpoch&&generation===readingContext.generation&&!controller.signal.aborted;
 const forms=state.entry.forms.slice(0,8),results=new Array(forms.length);let index=0;
 const timeout=setTimeout(()=>controller.abort(),40000);$('readingImages').hidden=true;$('readingImages').replaceChildren();
 try{await Promise.all([0,1].map(async()=>{while(index<forms.length&&current()){const i=index++;try{const data=await readingCommons(forms[i],entryId,current,refresh,controller.signal);if(data?.images?.length)results[i]={form:forms[i],data};}catch{}}}));}
 finally{clearTimeout(timeout);}
 if(!state.immersive||entryId!==state.id||epoch!==state.imageEpoch||generation!==readingContext.generation)return;
 const groups=results.filter(Boolean);state.currentImages=groups.flatMap(group=>group.data.images.slice(0,3));if(!groups.length)return;
 const main=$('main'),previousTop=main.scrollTop,pageTop=window.scrollY||0,pageScrolling=main.clientHeight>window.innerHeight,rect=main.getBoundingClientRect(),anchor=document.elementFromPoint?.(rect.left+rect.width/2,Math.min(rect.bottom,window.innerHeight)*.55),anchorTop=anchor&&$('articleBody').contains(anchor)?anchor.getBoundingClientRect().top:null;
 $('readingImages').innerHTML=groups.map((group,i)=>'<section class="reading-image-group"><h2>'+esc(formName(group.form))+'</h2><div class="reading-image-grid">'+group.data.images.slice(0,3).map((im,j)=>'<figure><button type="button" class="reading-photo" data-reading-photo="'+i+':'+j+'" aria-label="'+esc(im.title)+'"><img loading="lazy" referrerpolicy="no-referrer" src="'+esc(im.display_url||im.thumbnail_url)+'" alt="'+esc(im.description||im.title)+'"></button><figcaption>'+ext(im.source_url,im.title)+'<span>'+esc(im.author||'')+' · '+(im.license_url?ext(im.license_url,im.license||t('license')):esc(im.license||''))+'</span></figcaption></figure>').join('')+'</div></section>').join('');
 $('readingImages').hidden=false;$('readingImages').querySelectorAll('[data-reading-photo]').forEach(button=>{const [i,j]=button.dataset.readingPhoto.split(':').map(Number),image=groups[i].data.images[j];imageError(button.querySelector('img'),image.id);button.addEventListener('click',event=>openImage(image,event.currentTarget));});animateArrival($('readingImages'),'image');if(anchorTop!==null)requestAnimationFrame(()=>{if(state.immersive&&entryId===state.id&&epoch===state.imageEpoch&&Math.abs(main.scrollTop-previousTop)<2&&Math.abs((window.scrollY||0)-pageTop)<2){const delta=anchor.getBoundingClientRect().top-anchorTop;if(pageScrolling)window.scrollTo?.(0,pageTop+delta);else main.scrollTop+=delta;}});
}
function chooseReadingSection(rows,viewport,previous){
 const height=Math.max(1,viewport.bottom-viewport.top),center=(viewport.bottom+viewport.top)/2;
 const candidates=rows.map(row=>({...row,visible:Math.max(0,Math.min(row.bottom,viewport.bottom)-Math.max(row.top,viewport.top)),complete:row.top>=viewport.top&&row.bottom<=viewport.bottom&&row.bottom>row.top})).filter(r=>r.visible>0);
 const complete=candidates.filter(r=>r.complete);let ranked=complete.length?complete:candidates;
 ranked.sort((a,b)=>complete.length?b.level-a.level||Math.abs((a.top+a.bottom)/2-center)-Math.abs((b.top+b.bottom)/2-center):(b.visible-a.visible)||b.level-a.level||Math.abs(a.top-center)-Math.abs(b.top-center));
 let winner=ranked[0];if(!winner)return null;
 if(!complete.length){const child=candidates.filter(r=>r.level>winner.level&&r.top>=winner.top&&r.bottom<=winner.bottom&&r.visible>=winner.visible*.5).sort((a,b)=>b.level-a.level||b.visible-a.visible)[0];if(child)winner=child;const old=candidates.find(r=>r.id===previous);if(old&&old.level===winner.level&&Math.abs(old.visible-winner.visible)<Math.min(12,height*.025))winner=old;}
 return winner.id;
}
function updateReadingOutline(){
 if(!state.immersive||readingContext.phase!=='ready'||state.lang!=='original'){$('readingOutline').hidden=true;readingContext.outline=[];return;}
 const toc=state.mode==='focus'?state.article?.focus_toc:state.article?.toc;readingContext.outline=(toc||[]).slice(0,256).map(row=>({...row,node:document.getElementById(row.id)})).filter(r=>r.node&&$('articleBody').contains(r.node));
 $('readingOutline').hidden=!readingContext.outline.length;
 $('readingOutlineLinks').innerHTML=readingContext.outline.map(row=>'<a href="#'+esc(row.id)+'" data-level="'+Number(row.level||2)+'" aria-label="'+esc(row.title)+'"><i aria-hidden="true"></i><span>'+esc(row.title)+'</span></a>').join('');scheduleReadingSection();
}
function paintReadingSection(id){state.readingSection=id;$('readingOutlineLinks').querySelectorAll('a').forEach(a=>{if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
function activateReadingChapter(id){
 if(!readingContext.outline.some(row=>row.id===id))return;
 readingContext.pinned=id;paintReadingSection(id);return act({type:'anchor',anchor:id});
}
function releaseReadingChapter(){readingContext.pinned=null;state.anchorPinned=false;scheduleReadingSection();}
function scheduleReadingSection(){if(readingContext.raf||!state.immersive)return;readingContext.raf=requestAnimationFrame(()=>{readingContext.raf=0;if(!state.immersive||!readingContext.outline.length)return;
 if(readingContext.pinned&&readingContext.outline.some(row=>row.id===readingContext.pinned)){paintReadingSection(readingContext.pinned);return;}
 const main=$('main').getBoundingClientRect(),top=Math.max(0,main.top,document.querySelector('.site-header').getBoundingClientRect().bottom)+70,bottom=Math.min(main.bottom,window.innerHeight)-15,bodyBottom=$('articleBody').getBoundingClientRect().bottom;
 const positions=readingContext.outline.map(row=>({...row,top:row.node.getBoundingClientRect().top}));const rows=positions.map((row,i)=>({id:row.id,level:Number(row.level||2),top:row.top,bottom:positions.slice(i+1).find(next=>Number(next.level||2)<=Number(row.level||2))?.top??bodyBottom}));
 paintReadingSection(chooseReadingSection(rows,{top,bottom},state.readingSection));
 });}
async function readingSearch(){
 const query=$('readingSearch').value.trim(),epoch=++readingContext.searchEpoch;$('readingSearchResults').hidden=true;if(!query)return;
 try{const data=await api('/api/catalog?'+new URLSearchParams({q:query,scope:'all',limit:8}));if(epoch!==readingContext.searchEpoch||!state.immersive)return;
 $('readingSearchResults').innerHTML=data.entries.length?data.entries.map(row=>'<button type="button" data-reading-entry="'+esc(row.id)+'"><strong>'+esc(nameOf(row))+'</strong><small>'+esc(scientificOf(row))+'</small></button>').join(''):'<p>'+esc(t('noLocalMatches'))+'</p>';$('readingSearchResults').hidden=false;
 $('readingSearchResults').querySelectorAll('button').forEach(button=>button.addEventListener('click',async()=>{$('readingSearchResults').hidden=true;await act({type:'entry',id:button.dataset.readingEntry});$('main').scrollTop=0;}));
 }catch{if(epoch===readingContext.searchEpoch)$('readingSearchResults').hidden=true;}
}
function setupReadingMode(){
 $('toggleReadingMode').addEventListener('click',()=>act({type:'readingMode',enabled:!state.immersive}));$('readingRetry').addEventListener('click',()=>loadReadingArticle(true));
 $('readingSearch').addEventListener('input',()=>{clearTimeout(readingContext.searchTimer);readingContext.searchEpoch++;readingContext.searchTimer=setTimeout(readingSearch,180);});$('readingSearch').addEventListener('keydown',event=>{if(event.key==='Escape'){$('readingSearchResults').hidden=true;event.stopPropagation();}if(event.key==='ArrowDown'){$('readingSearchResults').querySelector('button')?.focus();event.preventDefault();}});
 document.addEventListener('click',event=>{if(!event.target.closest?.('#readingSearchRegion'))$('readingSearchResults').hidden=true;});
 $('readingOutlineToggle').addEventListener('click',()=>{const open=$('readingOutline').dataset.expanded!=='true';$('readingOutline').dataset.expanded=String(open);$('readingOutlineToggle').setAttribute('aria-expanded',String(open));});
 $('readingOutlineLinks').addEventListener('click',event=>{const link=event.target.closest?.('a');if(!link||!$('readingOutlineLinks').contains(link))return;event.preventDefault();event.stopPropagation();activateReadingChapter(link.getAttribute('href').slice(1));});
 for(const type of ['wheel','touchmove'])$('main').addEventListener(type,releaseReadingChapter,{passive:true});
 document.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)&&!event.target.closest?.('input,textarea,select,[contenteditable=true]'))releaseReadingChapter();});
 $('main').addEventListener('pointerdown',event=>{if(event.target===$('main'))releaseReadingChapter();});
 $('main').addEventListener('scroll',scheduleReadingSection,{passive:true});window.addEventListener('scroll',scheduleReadingSection,{passive:true});window.addEventListener('resize',scheduleReadingSection,{passive:true});
}
