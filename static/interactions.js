"use strict";
/* Shared popup lifecycle, context-aware repeat commands and the full-width source window. */
const popupStates=new WeakMap(),popupStack=[],disclosures=new WeakMap();
const repeatState={command:null,running:false,pending:false};
let navigatorFrame=0,journeyPersistTimer,sourceReturnScroll=null;

function popupDuration(type,closing=false){const level=motionLevel();return level?[0,100,closing?160:230,closing?230:type==='image'?420:340][level]:0;}
function motionEffect(element,frames,duration,easing="cubic-bezier(.16,1,.3,1)"){
 if(!duration||!element?.animate)return null;
 return trackMotion(element.animate(frames,{duration,easing}));
}
function popupFrames(dialog,type,closing,origin){
 const level=motionLevel();let start=type==='drawer'?'translateX(100%)':level===1?'none':`translateY(${level===3?15:7}px) scale(${level===3?.94:.98})`;
 if(type==='image'&&level===3&&origin?.getBoundingClientRect&&dialog.getBoundingClientRect){
  const a=origin.getBoundingClientRect(),b=dialog.getBoundingClientRect();
  start=`translate(${Math.max(-90,Math.min(90,(a.x+a.width/2-b.x-b.width/2)*.17))}px,${Math.max(-70,Math.min(70,(a.y+a.height/2-b.y-b.height/2)*.17))}px) scale(.9)`;
 }
 return closing?[{opacity:1,transform:'none'},{opacity:0,transform:start}]:[{opacity:0,transform:start},{opacity:1,transform:'none'}];
}
function interruptedPopupFrame(dialog,data){
 if(data?.effect?.playState!=='running'||!window.getComputedStyle)return null;
 const value=window.getComputedStyle(dialog);
 return value.opacity&&value.transform?{opacity:value.opacity,transform:value.transform}:null;
}
function showPopup(dialog,type='panel',origin=null){
 let data=popupStates.get(dialog)||{revision:0};const current=interruptedPopupFrame(dialog,data);data.revision++;const revision=data.revision;data.effect?.cancel();
 if(!dialog.open){data.opener=origin||document.activeElement;dialog.showModal();}
 data.type=type;data.origin=origin||data.origin;popupStates.set(dialog,data);
 const index=popupStack.indexOf(dialog);if(index>=0)popupStack.splice(index,1);popupStack.push(dialog);
 dialog.dataset.popupType=type;dialog.dataset.popupPhase='opening';
 const frames=popupFrames(dialog,type,false,data.origin);if(current)frames[0]=current;
 const effect=data.effect=motionEffect(dialog,frames,popupDuration(type));
 const done=()=>{if(data.revision===revision){delete dialog.dataset.popupPhase;data.effect=null;}};
 if(effect)effect.finished.then(done,done);else done();
 return effect?.finished.catch(()=>{})||Promise.resolve();
}
function closePopup(dialog,{immediate=false}={}){
 const data=popupStates.get(dialog)||{revision:0,type:'panel'};const current=interruptedPopupFrame(dialog,data);data.revision++;const revision=data.revision;data.effect?.cancel();popupStates.set(dialog,data);
 if(!dialog.open)return Promise.resolve();
 dialog.dataset.popupPhase='closing';
 const finish=()=>{if(data.revision!==revision)return;dialog.close();delete dialog.dataset.popupPhase;data.effect=null;const index=popupStack.indexOf(dialog);if(index>=0)popupStack.splice(index,1);if(data.opener?.isConnected&&(!document.activeElement||document.activeElement===document.body))data.opener.focus?.();updateRepeatButton();};
 const frames=popupFrames(dialog,data.type,true,data.origin);if(current)frames[0]=current;
 const effect=data.effect=immediate?null:motionEffect(dialog,frames,popupDuration(data.type,true),'cubic-bezier(.4,0,1,1)');
 if(!effect){finish();return Promise.resolve();}
 return effect.finished.catch(()=>{}).then(finish);
}
function activePopup(){return popupStack.filter(d=>d.open).at(-1)||Array.from(document.querySelectorAll('dialog[open]')).filter(d=>d.id!=='frameContainer'||d.dataset.expanded==='true').at(-1);}
function closeActivePopup(){const dialog=activePopup();if(!dialog)return false;if(dialog.id==='readingDrawer')closeReaderDrawer();else if(dialog.id==='frameContainer')act({type:'frameExpand',expanded:false});else if(dialog.id==='settingsDialog')closeSettings();else closePopup(dialog);return true;}

function revealList(container,selector='.catalog-item'){
 const level=motionLevel();if(!level)return;
 if(level<3){animateArrival(container,'list');return;}
 Array.from(container.querySelectorAll(selector)).slice(0,12).forEach((row,i)=>{
  if(row.animate)trackMotion(row.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:260,delay:Math.min(i*14,100),easing:'cubic-bezier(.16,1,.3,1)'}));
 });
}
function listPositions(container){return new Map(Array.from(container.querySelectorAll('[data-order-id]')).filter(e=>e.getBoundingClientRect).map(e=>[e.dataset.orderId,e.getBoundingClientRect()]));}
function animateListMove(container,before){
 if(!motionLevel())return;
 if(motionLevel()<3||!before.size){revealList(container,'[data-order-id]');return;}
 Array.from(container.querySelectorAll('[data-order-id]')).slice(0,20).forEach(row=>{const old=before.get(row.dataset.orderId),now=row.getBoundingClientRect?.();if(!old)motionEffect(row,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],270);else if(now&&(Math.abs(old.y-now.y)>1||Math.abs(old.x-now.x)>1))motionEffect(row,[{transform:`translate(${old.x-now.x}px,${old.y-now.y}px)`},{transform:'none'}],360);});
}
function revealNewRows(container,start,selector){const nodes=Array.from(container.querySelectorAll(selector)).slice(start,start+12);if(!motionLevel())return;nodes.forEach((node,i)=>{if(node.animate)trackMotion(node.animate([{opacity:0,transform:motionLevel()>1?'translateY(6px)':'none'},{opacity:1,transform:'none'}],{duration:motionLevel()===3?270:130,delay:motionLevel()===3?i*10:0,easing:'cubic-bezier(.16,1,.3,1)'}));});}
function selectionFeedback(action){
 const containers={form:'forms',source:'sourceTabs',imageProfile:'imageProfile',provider:'imageTabs',readerMode:'readerControls',group:'groupFilters'};
 const container=$(containers[action.type]);if(!container)return;
 const target=container.querySelector?.('[aria-pressed="true"]')||container;
 if(motionLevel()>1)motionEffect(target,[{opacity:.65,transform:'scale(.97)'},{opacity:1,transform:'none'}],motionLevel()===3?220:140);
}
function setSurfaceVisible(element,visible){
 const old=element.dataset.surfaceVisible===undefined?!element.hidden:element.dataset.surfaceVisible==='true';element.dataset.surfaceVisible=String(visible);
 if(old===visible){if(visible)element.hidden=false;return;}
 const data=disclosures.get(element)||{revision:0};data.revision++;const revision=data.revision;data.effect?.cancel();disclosures.set(element,data);
 if(visible)element.hidden=false;
 const duration=motionLevel()?[0,90,180,280][motionLevel()]:0;
 const frames=visible?[{opacity:0,transform:'translateY(-7px)'},{opacity:1,transform:'none'}]:[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-7px)'}];
 const effect=data.effect=motionEffect(element,frames,duration);
 const done=()=>{if(data.revision===revision)element.hidden=!visible;};if(effect)effect.finished.then(done,done);else done();
}
function disclose(element,open){
 const data=disclosures.get(element)||{revision:0};data.revision++;const revision=data.revision;data.effect?.cancel();data.open=open;disclosures.set(element,data);
 const height=element.scrollHeight||element.getBoundingClientRect?.().height||0;element.hidden=false;element.style.overflow='hidden';
 const duration=motionLevel()?[0,80,170,250][motionLevel()]:0;
 const effect=data.effect=height?motionEffect(element,open?[{height:'0px',opacity:0},{height:height+'px',opacity:1}]:[{height:height+'px',opacity:1},{height:'0px',opacity:0}],duration):null;
 const done=()=>{if(data.revision===revision){element.hidden=!open;element.style.removeProperty('height');element.style.removeProperty('overflow');}};
 return effect?effect.finished.catch(()=>{}).then(done):(done(),Promise.resolve());
}
function toggleDetails(details){
 let body=details.querySelector(':scope > .details-body');
 if(!body){body=document.createElement('div');body.className='details-body';const summary=details.querySelector(':scope > summary');let node=summary?.nextSibling;while(node){const next=node.nextSibling;body.appendChild(node);node=next;}details.appendChild(body);body.hidden=!details.hasAttribute('open');}
 const current=disclosures.get(body);const open=!(current?current.open:details.hasAttribute('open'));
 details.setAttribute('open','');return disclose(body,open).then(()=>{if(disclosures.get(body)?.open===false)details.removeAttribute('open');});
}

function rememberRepeat(command){repeatState.command={...command,version:state.version};try{sessionStorage.setItem('atlas-repeat:'+state.version,JSON.stringify(repeatState.command));}catch{}updateRepeatButton();}
function restoreRepeatCommand(){try{const value=JSON.parse(sessionStorage.getItem('atlas-repeat:'+state.version)||'null');if(!value)return;const labels={treePage:value.direction>0?'treeNext':'treePrevious',page:value.direction>0?'catalogNextLabel':'catalogPreviousLabel',random:'randomExplore',image:value.direction>0?'imageNextLabel':'imagePreviousLabel',audit:'auditNextLabel',logs:'logsNextLabel'};if(labels[value.kind]&&(!['page','treePage','image'].includes(value.kind)||[-1,1].includes(value.direction)))rememberRepeat({kind:value.kind,direction:value.direction,label:labels[value.kind]});}catch{}}
function pageCommand(direction){if($(direction>0?'catalogNext':'catalogPrevious').disabled&&!repeatState.running)return;rememberRepeat({kind:'page',direction,label:direction>0?'catalogNextLabel':'catalogPreviousLabel'});return repeatLastAction();}
function repeatAllowed(command=repeatState.command){
 if(!command||command.version!==state.version)return false;const popup=activePopup();
 if(command.kind==='image'){const index=(state.viewerIndex||0)+command.direction;return popup?.id==='imageDialog'&&index>=0&&index<(state.viewerImages||[]).length;}
 if(command.kind==='audit')return popup?.id==='settingsDialog'&&state.activeSettings==='catalogue'&&!$('auditNext').hidden;
 if(command.kind==='logs')return popup?.id==='settingsDialog'&&state.activeSettings==='logs'&&!$('moreLogs').hidden;
 if(popup)return false;
 if(command.kind==='treePage')return !$(command.direction>0?'treeNext':'treePrevious').disabled;
 if(command.kind==='page')return !$(command.direction>0?'catalogNext':'catalogPrevious').disabled;
 return command.kind==='random';
}
function updateRepeatButton(){
 const command=repeatState.command,button=$('repeatAction');if(!button)return;
 button.disabled=!repeatAllowed()||repeatState.running;button.title=t('repeatAction')+' · R'+(command?' · '+t(command.label):'');
 $('repeatHint').textContent=command?'R · '+t(command.label):t('shortcutHint');
 $('goBack').title=t('goBack')+' · Alt+←';$('goForward').title=t('goForward')+' · Alt+→';$('openShortcuts').title=t('keyboardShortcuts')+' · ?';
 button.setAttribute('aria-label',t('repeatAction'));$('openShortcuts').setAttribute('aria-label',t('keyboardShortcuts'));
}
async function executeRepeat(command){
 if(command.kind==='treePage')await act({type:'treePage',direction:command.direction});
 else if(command.kind==='page')await act({type:'page',direction:command.direction});
 else if(command.kind==='random')await randomExplore();
 else if(command.kind==='image')stepImage(command.direction);
 else if(command.kind==='audit')await loadAudit();
 else if(command.kind==='logs')await loadLogs();
}
async function repeatLastAction(){
 if(repeatState.running){repeatState.pending=true;return;}
 if(!repeatAllowed())return;
 repeatState.running=true;updateRepeatButton();
 try{do{repeatState.pending=false;const command={...repeatState.command};if(!repeatAllowed(command))break;await executeRepeat(command);}while(repeatState.pending&&repeatAllowed());}
 catch(error){showNotice('globalMessage',errorMessage(error));}
 finally{repeatState.running=false;repeatState.pending=false;updateRepeatButton();}
}
function isEditing(target){return !!target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');}
function shortcutHelp(){
 $('helpTitle').textContent=t('keyboardShortcuts');
 const keys=configuredShortcuts();const rows=[['R','repeatHelp'],[keys.tree_previous+' / '+keys.tree_next,'treePageShortcutHelp'],[keys.entry_previous+' / '+keys.entry_next,'pageShortcutHelp'],['Alt + ← / →','navigationShortcutHelp'],['Esc','escapeShortcutHelp'],['/','searchShortcutHelp'],['← / →','imageShortcutHelp'],['?','shortcutsShortcutHelp']];
 $('helpBody').innerHTML='<p>'+esc(t('shortcutSafety'))+'</p><table class="shortcut-table">'+rows.map(([key,label])=>'<tr><th><kbd>'+esc(key)+'</kbd></th><td>'+esc(t(label))+'</td></tr>').join('')+'</table>';
 showPopup($('helpDialog'),'help');
}
function keyboardCommands(event){
 if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;
 if(event.altKey&&!event.ctrlKey&&!event.metaKey&&['ArrowLeft','ArrowRight'].includes(event.key)&&!activePopup()){
  event.preventDefault();travelJourney(event.key==='ArrowLeft'?-1:1);return;
 }
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.key==='Escape'){
  if(typeof noticeUi!=='undefined'&&noticeUi.open&&!activePopup()){event.preventDefault();setBellOpen(false);return;}
  if(closeActivePopup())event.preventDefault();else if(!$('frameContainer').hidden){event.preventDefault();act({type:'closeFrame'});}return;
 }
 if(isEditing(event.target))return;
 const popup=activePopup();
 if(popup?.id==='imageDialog'&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();stepImage(event.key==='ArrowLeft'?-1:1);return;}
 if(event.key==='?'){event.preventDefault();shortcutHelp();return;}
 const key=event.key.toLowerCase();
 if(key==='r'&&!event.shiftKey){event.preventDefault();repeatLastAction();return;}
 if(popup||event.shiftKey)return;
 const shortcuts=configuredShortcuts();if(key===shortcuts.tree_previous||key===shortcuts.tree_next){event.preventDefault();treePageCommand(key===shortcuts.tree_next?1:-1);return;}
 if(key===shortcuts.entry_previous||key===shortcuts.entry_next){event.preventDefault();pageCommand(key===shortcuts.entry_next?1:-1);return;}
 if(key==='n'||key==='p'){event.preventDefault();pageCommand(key==='n'?1:-1);}
 else if(event.key==='/'){event.preventDefault();(state.immersive?$('readingSearch'):$('search')).focus();$('search').select?.();}
}

function showImageViewer(image,origin){
 const images=state.currentImages||[];state.viewerImages=images.includes(image)?images:[image];state.viewerIndex=state.viewerImages.indexOf(image);
 renderImageViewer();showPopup($('imageDialog'),'image',origin);
}
function renderImageViewer(direction=0){
 const list=state.viewerImages||[],im=list[state.viewerIndex];if(!im)return;
 $('imageDialogContent').innerHTML='<img src="'+esc(im.display_url)+'" alt="'+esc(im.description||im.title)+'" referrerpolicy="no-referrer"><h3>'+esc(im.title)+'</h3><p>'+esc(im.description)+'</p><p>'+esc(im.author)+' · '+esc(im.license)+'</p><p>'+ext(im.source_url,t('source')+' ↗')+ext(im.original_url,t('originalImage')+' ↗')+(im.license_url?ext(im.license_url,t('license')+' ↗'):'')+'</p>';
 $('imagePrevious').disabled=state.viewerIndex<=0;$('imageNext').disabled=state.viewerIndex>=list.length-1;$('imagePosition').textContent=(state.viewerIndex+1)+' / '+list.length;
 if(direction&&motionLevel())motionEffect($('imageDialogContent'),[{opacity:0,transform:`translateX(${direction*14}px)`},{opacity:1,transform:'none'}],[0,80,170,270][motionLevel()]);
 updateRepeatButton();
}
function stepImage(direction){
 const target=(state.viewerIndex||0)+direction;if(target<0||target>=(state.viewerImages||[]).length)return;
 state.viewerIndex=target;rememberRepeat({kind:'image',direction,label:direction>0?'imageNextLabel':'imagePreviousLabel'});renderImageViewer(direction);
}

function sourceInline(){
 const panel=$('frameContainer');panel.hidden=false;panel.dataset.expanded='false';panel.setAttribute('role','region');panel.removeAttribute('aria-modal');
 if(!panel.open){if(panel.show)panel.show();else{panel.open=true;panel.setAttribute('open','');}}
 $('expandSourceFrame').textContent=t('expandWindow');resizeSourceFrame();
}
async function toggleSourceWindow(expanded){
 const panel=$('frameContainer');if(panel.hidden)return;
 if(expanded){
  if(panel.dataset.expanded==='true')return;
  sourceReturnScroll={main:$('main').scrollTop,window:window.scrollY||0};
  if(panel.open)panel.close();panel.dataset.expanded='true';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  state.frameExpanded=true;showPopup(panel,'source',$('expandSourceFrame'));$('expandSourceFrame').textContent=t('collapseWindow');resizeSourceFrame();
 }else{
  if(panel.dataset.expanded==='true')await closePopup(panel);
  state.frameExpanded=false;sourceInline();
  if(sourceReturnScroll){$('main').scrollTop=sourceReturnScroll.main;window.scrollTo?.(0,sourceReturnScroll.window);sourceReturnScroll=null;}
 }
}
function clearSourceWindow(){
 const panel=$('frameContainer');closePopup(panel,{immediate:true});panel.hidden=true;panel.dataset.expanded='false';state.frameExpanded=false;sourceReturnScroll=null;$('sourceFrame').removeAttribute('src');
}
async function dismissSourceWindow(){
 const panel=$('frameContainer');await closePopup(panel);panel.hidden=true;panel.dataset.expanded='false';state.frameExpanded=false;sourceReturnScroll=null;$('sourceFrame').removeAttribute('src');
}

function positionNavigator(){
 navigatorFrame=0;const main=$('main'),header=document.querySelector('.site-header');if(!main?.getBoundingClientRect||!header?.getBoundingClientRect)return;
 const rect=main.getBoundingClientRect(),head=header.getBoundingClientRect();const padding=window.getComputedStyle?parseFloat(window.getComputedStyle(main).paddingLeft)||16:16;
 document.documentElement.style.setProperty('--navigator-left',Math.max(12,rect.left+padding)+'px');document.documentElement.style.setProperty('--header-bottom',Math.max(0,head.bottom)+'px');
 $('readingNavigator').style.visibility=rect.top>head.bottom+150&&window.innerWidth<=760?'hidden':'visible';
}
function scheduleNavigator(){if(!navigatorFrame)navigatorFrame=requestAnimationFrame(positionNavigator);}
function scheduleJourneyPersist(){clearTimeout(journeyPersistTimer);journeyPersistTimer=setTimeout(persistJourney,220);}

function buttonInk(event){
 if(motionLevel()!==3)return;const button=event.target.closest?.('button');if(!button||button.disabled||!button.getBoundingClientRect||!button.animate)return;
 if(window.getComputedStyle?.(button).position==='static')button.style.position='relative';
 const rect=button.getBoundingClientRect(),ink=document.createElement('span');ink.className='button-ink';ink.setAttribute('aria-hidden','true');
 ink.style.left=(event.detail?event.clientX-rect.left:rect.width/2)+'px';ink.style.top=(event.detail?event.clientY-rect.top:rect.height/2)+'px';
 const size=Math.max(rect.width,rect.height)*2;ink.style.width=size+'px';ink.style.height=size+'px';button.appendChild(ink);
 const effect=motionEffect(ink,[{transform:'translate(-50%,-50%) scale(0)',opacity:.2},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],420);
 const remove=()=>ink.remove();if(effect)effect.finished.then(remove,remove);else remove();
}
function settleMotion(){for(const effect of ownedAnimations){try{effect.finish();}catch{effect.cancel();}}paletteTransition?.skipTransition?.();$('themeBloom').classList.remove('blooming');}
function setupInteractions(){
 setupCatalogueNavigation();
 $('repeatAction').addEventListener('click',repeatLastAction);$('openShortcuts').addEventListener('click',shortcutHelp);document.addEventListener('keydown',keyboardCommands);
 $('imagePrevious').addEventListener('click',()=>stepImage(-1));$('imageNext').addEventListener('click',()=>stepImage(1));
 $('expandSourceFrame').addEventListener('click',()=>act({type:'frameExpand',expanded:$('frameContainer').dataset.expanded!=='true'}));
 $('frameContainer').addEventListener('cancel',event=>{event.preventDefault();act({type:'frameExpand',expanded:false});});
 for(const id of ['imageDialog','settingsDialog','helpDialog'])$(id).addEventListener('cancel',event=>{event.preventDefault();if(id==='settingsDialog')closeSettings();else closePopup($(id));});
 document.addEventListener('click',event=>{buttonInk(event);const summary=event.target.closest?.('summary');if(summary&&!event.target.closest?.('a,button,input,select')){event.preventDefault();toggleDetails(summary.parentElement);}});
 if(window.ResizeObserver){const observer=new window.ResizeObserver(scheduleNavigator);observer.observe($('main'));observer.observe(document.querySelector('.site-header'));}
 window.addEventListener('resize',scheduleNavigator);window.addEventListener('scroll',scheduleNavigator,{passive:true});window.addEventListener('beforeprint',settleMotion);
 setupSourceBoard();setupNotificationBell();setupRuntimeEvents();scheduleNavigator();updateRepeatButton();
}
