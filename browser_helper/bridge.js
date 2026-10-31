/* Runs before page scripts. Only a local Atlas document and a recent real action may open a split. */
(()=>{
 let lastGesture=0;
 const isAtlas=()=>document.getElementById('homeLink')&&document.getElementById('imageTabs')&&document.getElementById('entryName');
 for(const type of ['pointerdown','keydown'])window.addEventListener(type,event=>{if(event.isTrusted)lastGesture=Date.now();},{capture:true,passive:true});
 async function send(message){try{return await chrome.runtime.sendMessage(message)||{ok:false,code:'helper_unavailable'};}catch{return {ok:false,code:'helper_unavailable'};}}
 window.addEventListener('message',async event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='SPICE_ATLAS_BROWSER_REQUEST'||!isAtlas())return;
  const {id,action,url}=event.data;if(typeof id!=='string'||id.length>150||!['capabilities','openSplit','closeSplit'].includes(action))return;
  const reply=result=>window.postMessage({channel:'SPICE_ATLAS_BROWSER_RESPONSE',id,result},location.origin);
  // Source checks may take longer than 30 seconds. The lease remains bounded and cannot be armed by scripts.
  if(action==='openSplit'&&(!lastGesture||Date.now()-lastGesture>120000)){reply({ok:false,code:'user_gesture_required'});return;}
  reply(await send({action,url}));
 });
 chrome.runtime.onMessage?.addListener(message=>{if(message?.action==='splitState'&&isAtlas())window.postMessage({channel:'SPICE_ATLAS_BROWSER_STATE',result:message.result},location.origin);});
 const announce=async()=>{if(isAtlas())window.postMessage({channel:'SPICE_ATLAS_BROWSER_READY',result:await send({action:'capabilities'})},location.origin);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',announce,{once:true});else void announce();
})();
