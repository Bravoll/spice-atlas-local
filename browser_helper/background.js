/* No remote page access, script injection, header rewriting or tab-content reading. */
function allowedSearch(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['www.google.com','google.com'].includes(u.hostname)&&u.pathname==='/search'||['www.bing.com','cn.bing.com'].includes(u.hostname)&&u.pathname.startsWith('/images/search')||u.hostname==='image.baidu.com'&&u.pathname==='/search/index')?u.href:null;}catch{return null;}}
function localAtlas(value){try{const u=new URL(value);return u.protocol==='http:'&&!u.username&&!u.password&&['127.0.0.1','localhost'].includes(u.hostname)&&['/','/static/index.html'].includes(u.pathname);}catch{return false;}}
function sourceFromSender(sender){
 if(!sender.tab||!Number.isInteger(sender.tab.id)||(sender.frameId!==undefined&&sender.frameId!==0))return null;
 // MessageSender.url identifies the sending document even when Tab.url is withheld.
 const url=sender.url||sender.tab.url;return localAtlas(url)?{id:sender.tab.id,url}:null;
}
const splitTab=tab=>Number.isInteger(tab?.splitViewId)&&tab.splitViewId>=0;
async function openNativeSplit(api,source,url){
 const target=allowedSearch(url);if(!target||!Number.isInteger(source.id)||!localAtlas(source.url))return {ok:false,code:'invalid_target'};
 if(typeof api.tabs.createSplit!=='function')return {ok:false,code:'split_unsupported'};
 let pair,stage='source';
 try{
  let tab=await api.tabs.get(source.id);
  if(tab.url&&(!localAtlas(tab.url)||new URL(tab.url).origin!==new URL(source.url).origin))return {ok:false,code:'invalid_target'};
  const key='atlas-pair-'+source.id,stored=await api.storage.session.get(key),old=stored[key];
  if(Number.isInteger(old)&&old!==tab.id)try{pair=await api.tabs.get(old);}catch{}
  if(splitTab(tab)){
   if(!pair||pair.windowId!==tab.windowId||!splitTab(pair)||pair.splitViewId!==tab.splitViewId)return {ok:false,code:'existing_user_split'};
   await api.tabs.update(pair.id,{url:target,active:true});return {ok:true,mode:'split',reused:true};
  }
  if(pair&&(pair.windowId!==tab.windowId||splitTab(pair)))pair=null;
  const reused=!!pair;stage='create';
  if(!pair){
   pair=await api.tabs.create({url:target,windowId:tab.windowId,index:tab.index+1,pinned:!!tab.pinned,active:false});
   // Remember the helper-owned tab before attempting a split, so a failed retry reuses it.
   await api.storage.session.set({[key]:pair.id});
  }else pair=await api.tabs.update(pair.id,{url:target,active:false,pinned:!!tab.pinned});
  stage='prepare';
  if(Number.isInteger(tab.groupId)&&tab.groupId>=0&&pair.groupId!==tab.groupId)await api.tabs.group({tabIds:pair.id,groupId:tab.groupId});
  else if((tab.groupId===undefined||tab.groupId<0)&&pair.groupId>=0)await api.tabs.ungroup(pair.id);
  tab=await api.tabs.get(source.id);pair=await api.tabs.get(pair.id);
  if(tab.url&&(!localAtlas(tab.url)||new URL(tab.url).origin!==new URL(source.url).origin))return {ok:false,code:'invalid_target',mode:'tab'};
  if(splitTab(tab))return {ok:false,code:'existing_user_split',mode:'tab'};
  if(pair.index!==tab.index+1)await api.tabs.move(pair.id,{windowId:tab.windowId,index:tab.index+(pair.index<tab.index?0:1)});
  // Explicitly call the documented API. Merely creating a tab does not prove a split exists.
  stage='split';await api.tabs.createSplit([tab.id,pair.id]);
  for(let attempt=0;attempt<4;attempt++){
   const [left,right]=await Promise.all([api.tabs.get(tab.id),api.tabs.get(pair.id)]);
   if(splitTab(left)&&splitTab(right)&&left.windowId===right.windowId&&left.splitViewId===right.splitViewId){
    await api.tabs.update(pair.id,{active:true});return {ok:true,mode:'split',reused};
   }
   if(attempt<3)await new Promise(resolve=>setTimeout(resolve,50));
  }
  return {ok:false,code:'split_not_created',mode:'tab'};
 }catch(error){return {ok:false,code:'browser_api_failed',stage,...(pair?{mode:'tab'}:{}),message:String(error?.message||error).slice(0,180)};}
}
async function splitState(api,source){
 const tab=await api.tabs.get(source.id),stored=await api.storage.session.get('atlas-pair-'+source.id);let pair;
 if(Number.isInteger(stored['atlas-pair-'+source.id]))try{pair=await api.tabs.get(stored['atlas-pair-'+source.id]);}catch{}
 return {splitActive:splitTab(tab),managedSplit:splitTab(tab)&&!!pair&&pair.windowId===tab.windowId&&pair.splitViewId===tab.splitViewId};
}
async function closeNativeSplit(api,source){
 if(!Number.isInteger(source.id)||!localAtlas(source.url))return {ok:false,code:'invalid_target'};
 try{
  const tab=await api.tabs.get(source.id),key='atlas-pair-'+source.id,stored=await api.storage.session.get(key);let pair;
  if(tab.url&&(!localAtlas(tab.url)||new URL(tab.url).origin!==new URL(source.url).origin))return {ok:false,code:'invalid_target'};
  if(Number.isInteger(stored[key])&&stored[key]!==tab.id)try{pair=await api.tabs.get(stored[key]);}catch{}
  if(!pair){await api.storage.session.remove(key);return {ok:!splitTab(tab),closed:false,code:splitTab(tab)?'unmanaged_split':undefined,splitActive:splitTab(tab),managedSplit:false};}
  const ownPair=pair.windowId===tab.windowId&&((!splitTab(tab)&&!splitTab(pair))||(splitTab(tab)&&pair.splitViewId===tab.splitViewId));
  if(!ownPair)return {ok:false,code:'unmanaged_split',...(await splitState(api,source))};
  // Closing only our recorded partner removes its pane as well as the disposable source tab.
  if(splitTab(tab)&&typeof api.tabs.unsplit==='function')await api.tabs.unsplit(tab.splitViewId);
  await api.tabs.remove(pair.id);await api.storage.session.remove(key);await api.tabs.update(tab.id,{active:true});
  const state=await splitState(api,source);return {ok:!state.splitActive,closed:!state.splitActive,...(state.splitActive?{code:'close_failed'}:{}),...state};
 }catch(error){return {ok:false,code:'close_failed',message:String(error?.message||error).slice(0,180)};}
}
const splitQueues=new Map();
function queuedOperation(api,source,operation){
 const previous=splitQueues.get(source.id)||Promise.resolve(),next=previous.catch(()=>{}).then(operation);splitQueues.set(source.id,next);
 const clean=()=>{if(splitQueues.get(source.id)===next)splitQueues.delete(source.id);};next.then(clean,clean);return next;
}
function queuedSplit(api,source,url){return queuedOperation(api,source,()=>openNativeSplit(api,source,url));}
function queuedClose(api,source){return queuedOperation(api,source,()=>closeNativeSplit(api,source));}
if(typeof chrome!=='undefined')chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 const source=sourceFromSender(sender);if(!source)return false;
 if(message?.action==='capabilities'){
  splitState(chrome,source).then(value=>reply({ok:true,nativeSplit:typeof chrome.tabs.createSplit==='function',helperVersion:chrome.runtime.getManifest().version,protocolVersion:2,ratioControl:false,...value}),()=>reply({ok:false,code:'helper_unavailable'}));return true;
 }
 if(!['openSplit','closeSplit'].includes(message?.action))return false;
 const operation=message.action==='closeSplit'?queuedClose(chrome,source):queuedSplit(chrome,source,message.url);
 operation.then(reply,()=>reply({ok:false,code:'browser_api_failed'}));return true;
});
if(typeof chrome!=='undefined'){
 const notify=async id=>{try{const tab=await chrome.tabs.get(id);if(localAtlas(tab.url))await chrome.tabs.sendMessage(id,{action:'splitState',result:await splitState(chrome,{id,url:tab.url})});}catch{}};
 chrome.tabs.onUpdated?.addListener((id,change)=>{if(change.splitViewId!==undefined)void notify(id);});
 chrome.tabs.onRemoved?.addListener(id=>{void(async()=>{try{const values=await chrome.storage.session.get(null);for(const [key,pair] of Object.entries(values))if(key.startsWith('atlas-pair-')){const source=Number(key.slice(11));if(source===id)await chrome.storage.session.remove(key);else if(pair===id){await chrome.storage.session.remove(key);await notify(source);}}}catch{}})();});
}
if(typeof module!=='undefined')module.exports={allowedSearch,localAtlas,sourceFromSender,openNativeSplit,queuedSplit,splitState,closeNativeSplit,queuedClose};
