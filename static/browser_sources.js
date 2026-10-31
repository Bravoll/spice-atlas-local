"use strict";
/* A normal page cannot call extension-only tabs APIs. Use an explicit local bridge. */
const browserSources={connected:false,nativeSplit:false,outdated:false,helperVersion:'',protocolVersion:0,splitActive:false,managedSplit:false,externalWanted:false,closing:null,pending:new Map(),opening:new Map(),url:null,probe:null,capabilityRevision:0,automatic:null,attempted:null};
function browserIdentity(){const agent=navigator.userAgent||'';const edge=agent.match(/Edg\/(\d+)/),chrome=agent.match(/Chrome\/(\d+)/);return edge?'Edge '+edge[1]:chrome?'Chrome '+chrome[1]:t('browserOther');}
function safeSearchPage(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['www.google.com','google.com'].includes(u.hostname)&&u.pathname==='/search'||['www.bing.com','cn.bing.com'].includes(u.hostname)&&u.pathname.startsWith('/images/search')||u.hostname==='image.baidu.com'&&u.pathname==='/search/index')?u.href:null;}catch{return null;}}
function helperResult(result){return result&&typeof result==='object'&&!Array.isArray(result)?result:{ok:false,code:'helper_unavailable'};}
function browserHelperRequest(action,url){
 if(typeof window.postMessage!=='function')return Promise.resolve({ok:false,code:'helper_unavailable'});
 const id=resourceEventId();return new Promise(resolve=>{const timer=setTimeout(()=>{browserSources.pending.delete(id);resolve({ok:false,code:'helper_unavailable'});},action==='capabilities'?2200:12000);browserSources.pending.set(id,{resolve,timer});window.postMessage({channel:'SPICE_ATLAS_BROWSER_REQUEST',id,action,url},new URL(location.href).origin);});
}
function applyNativeSplitState(result){
 if(typeof result.splitActive==='boolean')browserSources.splitActive=result.splitActive;
 if(typeof result.managedSplit==='boolean')browserSources.managedSplit=result.managedSplit;
 if(document.body)document.body.dataset.nativeSplit=String(browserSources.splitActive);
 if(typeof renderCatalogueLayout==='function')renderCatalogueLayout();
 if($('closeSourceSplit'))$('closeSourceSplit').hidden=!browserSources.managedSplit;
}
function rememberBrowserCapability(result){
 browserSources.connected=!!result.ok;browserSources.helperVersion=result.ok?String(result.helperVersion||''):'';browserSources.protocolVersion=Number(result.protocolVersion)||0;browserSources.outdated=!!result.ok&&(!browserSources.helperVersion||browserSources.protocolVersion<2);browserSources.nativeSplit=!!result.ok&&!!result.nativeSplit&&!browserSources.outdated;
 applyNativeSplitState(result);renderBrowserCapability();if(!browserSources.externalWanted&&browserSources.managedSplit&&!browserSources.closing&&!browserSources.outdated)void releaseBrowserSplit();
}
function probeBrowserHelper(force=false){
 if(browserSources.probe&&!force)return browserSources.probe;
 const revision=++browserSources.capabilityRevision;
 const pending=browserHelperRequest('capabilities').then(result=>{if(revision===browserSources.capabilityRevision)rememberBrowserCapability(result);return result;}).finally(()=>{if(browserSources.probe===pending)browserSources.probe=null;});
 browserSources.probe=pending;return pending;
}
function renderBrowserCapability(){
 const version=browserSources.helperVersion?' · '+t('splitHelperVersion',{version:browserSources.helperVersion}):'';
 $('browserSourceCapability').textContent=browserIdentity()+version+' · '+t(browserSources.outdated?'splitHelperOutdated':browserSources.nativeSplit?'splitHelperReady':browserSources.connected?edgeBrowser()?'splitEdgeCapability':'splitApiCapability':'splitHelperMissing');
 $('openSourceSplit').textContent=t(browserSources.nativeSplit?'openNativeSplit':'splitReconnect');
 $('openSourceSplit').hidden=browserSources.connected&&!browserSources.outdated&&!browserSources.nativeSplit;
}
const edgeBrowser=()=>/Edg\//.test(navigator.userAgent||'');
function unavailableSplitMessage(){return t(browserSources.outdated?'splitHelperOutdated':browserSources.connected?edgeBrowser()?'splitEdgeUnsupported':'splitApiMissing':'splitHelperDisconnected');}
function renderImageQuery(data={}){
 let query=data.query||data.gateways?.query||'';const url=data.source_url||data.gateways?.[state.imageProvider]||state.entry?.image_gateways?.[state.imageProvider];
 if(!query&&url)try{const p=new URL(url).searchParams;query=p.get('q')||p.get('word')||p.get('search')||'';}catch{}
 $('imageQuery').textContent=query;$('imageQuery').parentElement.hidden=!query;
}
function browserSplitMessage(result){
 if(result.ok)return t('splitOpened');
 const key={helper_unavailable:'splitHelperDisconnected',split_unsupported:'splitApiMissing',user_gesture_required:'splitGestureExpired',existing_user_split:'splitExistingUser',split_not_created:'splitUnconfirmed',invalid_target:'splitSourceChanged'}[result.code];
 if(key)return t(key);
 if(result.message)return t(result.mode==='tab'?'splitTabOnlyReason':'splitBrowserReason',{reason:String(result.message).slice(0,180)});
 return t('splitCouldNotOpen');
}
function currentBrowserSource(request){return request&&request.epoch===state.frameEpoch&&request.url===browserSources.url;}
function requestNativeSplit(request){
 if(!currentBrowserSource(request))return Promise.resolve();
 browserSources.externalWanted=true;
 const key=request.epoch+'|'+request.url;if(browserSources.opening.has(key))return browserSources.opening.get(key);
 $('browserSourceExplanation').textContent=t('splitOpening');
 const pending=browserHelperRequest('openSplit',request.url).then(result=>{
  if(!currentBrowserSource(request)){if(!browserSources.externalWanted)void releaseBrowserSplit();return result;}
  if(result.ok&&result.mode==='split')applyNativeSplitState({splitActive:true,managedSplit:true});
  if(result.code==='helper_unavailable')rememberBrowserCapability({ok:false});
  if(result.code==='split_unsupported')rememberBrowserCapability({ok:true,nativeSplit:false,helperVersion:browserSources.helperVersion});
  $('browserSourceExplanation').textContent=browserSplitMessage(result)+(result.ok?' '+t('splitRatioHint'):'');return result;
 }).finally(()=>{if(browserSources.opening.get(key)===pending)browserSources.opening.delete(key);});
 browserSources.opening.set(key,pending);return pending;
}
function releaseBrowserSplit(manual=false){
 browserSources.externalWanted=false;browserSources.automatic=null;browserSources.attempted=null;
 if(!browserSources.connected||browserSources.outdated||browserSources.protocolVersion<2)return Promise.resolve({ok:false,code:'helper_unavailable'});
 const pending=browserHelperRequest('closeSplit').then(result=>{
  applyNativeSplitState(result);
  if(manual)$('browserSourceExplanation').textContent=t(result.ok?'splitClosed':result.code==='unmanaged_split'?'splitUnmanaged':'splitCloseFailed');
  return result;
 }).finally(()=>{if(browserSources.closing===pending)browserSources.closing=null;});
 browserSources.closing=pending;return pending;
}
function prepareBrowserSource(provider){
 browserSources.automatic=null;
 if(provider==='commons'||provider==='bing')return releaseBrowserSplit();
 browserSources.externalWanted=true;return Promise.resolve();
}
function tryAutomaticSplit(){
 const request=browserSources.automatic;if(!browserSources.nativeSplit||!currentBrowserSource(request))return Promise.resolve();
 const key=request.epoch+'|'+request.url;if(browserSources.attempted===key)return Promise.resolve();
 browserSources.attempted=key;return requestNativeSplit(request);
}
async function offerBrowserSource(result,epoch){
 const url=safeSearchPage(result.url);if(!url||epoch!==state.frameEpoch)return;
 browserSources.externalWanted=true;browserSources.url=url;browserSources.automatic={url,epoch};$('openSourceTab').href=url;$('browserSourceFallback').hidden=false;
 if(!state.currentImages?.length)$('imageGrid').replaceChildren();
 $('browserSourceExplanation').textContent=t(result.code==='verification_required'?'splitVerificationNote':'splitFrameNote');renderBrowserCapability();
 await probeBrowserHelper(true);if(epoch!==state.frameEpoch)return;
 if(!browserSources.nativeSplit){$('browserSourceExplanation').textContent=t(result.code==='verification_required'?'splitVerificationNote':'splitFrameNote')+' '+unavailableSplitMessage();return;}
 await tryAutomaticSplit();
}
function setupBrowserSources(){
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==new URL(location.href).origin)return;
  if(event.data?.channel==='SPICE_ATLAS_BROWSER_STATE'){
   applyNativeSplitState(helperResult(event.data.result));if(!browserSources.externalWanted&&browserSources.managedSplit&&!browserSources.closing)void releaseBrowserSplit();return;
  }
  if(event.data?.channel==='SPICE_ATLAS_BROWSER_READY'){
   ++browserSources.capabilityRevision;rememberBrowserCapability(helperResult(event.data.result));void tryAutomaticSplit();return;
  }
  if(event.data?.channel!=='SPICE_ATLAS_BROWSER_RESPONSE')return;
  const row=browserSources.pending.get(event.data.id);if(!row)return;clearTimeout(row.timer);browserSources.pending.delete(event.data.id);row.resolve(helperResult(event.data.result));
 });
 void probeBrowserHelper();
 window.addEventListener('focus',()=>{void probeBrowserHelper(true);});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void probeBrowserHelper(true);});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);if(browserSources.splitActive)resizeTimer=setTimeout(()=>{void probeBrowserHelper(true);},120);});
 $('closeSourceSplit')?.addEventListener('click',()=>{void releaseBrowserSplit(true);});
 $('openSourceSplit').addEventListener('click',async()=>{
  const request={url:browserSources.url,epoch:state.frameEpoch};$('openSourceSplit').disabled=true;
  try{
   await probeBrowserHelper(true);
   if(browserSources.nativeSplit&&safeSearchPage(request.url)&&currentBrowserSource(request)){await requestNativeSplit(request);return;}
   $('browserSourceExplanation').textContent=unavailableSplitMessage();
  }finally{$('openSourceSplit').disabled=false;}
 });
}
