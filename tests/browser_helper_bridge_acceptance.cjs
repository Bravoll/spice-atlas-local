/* Cross-context contract tests. No native browser or external sites are used. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const local='http://127.0.0.1:8765/?entry=basil',target='https://www.google.com/search?tbm=isch&q=basil';
function browser({supported=true,group=-1,pinned=false,rejectSplit=false,unconfirmed=false}={}){
 const calls=[],saved={},tabs=new Map([[1,{id:1,url:local,index:4,windowId:2,groupId:group,pinned,splitViewId:-1}]]),updated=[],removed=[];let listener;
 const api={calls,tabsState:tabs,storage:{session:{get:async()=>({...saved}),set:async values=>Object.assign(saved,values),remove:async key=>{delete saved[key];}}},runtime:{id:'fixture-helper',getManifest:()=>({version:'0.8.2'}),onMessage:{addListener(fn){listener=fn;}}},tabs:{
  get:async id=>{if(!tabs.has(id))throw Error('No tab with id');return {...tabs.get(id)};},
  query:async()=>[...tabs.values()].map(tab=>({...tab})),
  create:async props=>{calls.push(['create',props]);const tab={id:8+calls.filter(c=>c[0]==='create').length-1,index:props.index,windowId:props.windowId,groupId:-1,pinned:!!props.pinned,splitViewId:-1,url:props.url};tabs.set(tab.id,tab);return {...tab};},
  update:async(id,props)=>{calls.push(['update',id,props]);Object.assign(tabs.get(id),props);return {...tabs.get(id)};},
  remove:async id=>{calls.push(['remove',id]);const old=tabs.get(id);tabs.delete(id);if(old?.splitViewId>=0)for(const t of tabs.values())if(t.splitViewId===old.splitViewId){t.splitViewId=-1;for(const fn of updated)fn(t.id,{splitViewId:-1});}for(const fn of removed)fn(id);},
  sendMessage:async(id,message)=>api.deliver?.(message),onUpdated:{addListener:fn=>updated.push(fn)},onRemoved:{addListener:fn=>removed.push(fn)},
  unsplit:async id=>{calls.push(['unsplit',id]);for(const t of tabs.values())if(t.splitViewId===id){t.splitViewId=-1;for(const fn of updated)fn(t.id,{splitViewId:-1});}},
  group:async({tabIds,groupId})=>{calls.push(['group',tabIds,groupId]);for(const id of [tabIds].flat())tabs.get(id).groupId=groupId;return groupId;},
  move:async(id,props)=>{calls.push(['move',id,props]);Object.assign(tabs.get(id),props);return {...tabs.get(id)};},
  createSplit:supported?async ids=>{calls.push(['split',ids]);if(rejectSplit)throw Error('Split view disabled by policy');const [a,b]=ids.map(id=>tabs.get(id));assert.equal(a.windowId,b.windowId);assert.equal(a.groupId,b.groupId);assert.equal(a.pinned,b.pinned);assert.equal(Math.abs(a.index-b.index),1);if(!unconfirmed)a.splitViewId=b.splitViewId=7;return 7;}:undefined
 }};
 vm.runInNewContext(fs.readFileSync(path.join(root,'browser_helper/background.js'),'utf8'),{chrome:api,URL,Map,setTimeout,clearTimeout,console});
 api.message=(message,sender={id:'fixture-helper',frameId:0,url:local,tab:{id:1}})=>new Promise((resolve,reject)=>{
  try{let replied=false;const asynchronous=listener(message,sender,value=>{replied=true;resolve(value);});if(!asynchronous&&!replied)resolve(undefined);}catch(error){reject(error);}
 });return api;
}
function page(agent='Chrome/155.0'){
 const events=new Map(),clock={now:1000},elements=new Map(),requests=[];let sequence=0;
 for(const id of ['homeLink','imageTabs','entryName','browserSourceCapability','openSourceSplit','closeSourceSplit','imageQuery','openSourceTab','browserSourceFallback','imageGrid','browserSourceExplanation','helpTitle','helpBody','helpDialog'])elements.set(id,{hidden:true,textContent:'',dataset:{},parentElement:{},replaceChildren(){},addEventListener(type,fn){this[type]=fn;}});
 const window={addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},postMessage(data,origin){requests.push(data);queueMicrotask(()=>dispatch('message',{data,origin,source:window}));}};
 function dispatch(type,value={}){for(const fn of events.get(type)||[])fn(value);}
 const document={body:{dataset:{}},readyState:'loading',visibilityState:'visible',getElementById:id=>elements.get(id),addEventListener:window.addEventListener.bind(window)};
 const location={href:local,origin:new URL(local).origin},state={frameEpoch:1,currentImages:[]},ctx=vm.createContext({window,document,location,state,navigator:{userAgent:agent},URL,Map,Date:{now:()=>clock.now},setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,60)),clearTimeout,resourceEventId:()=>String(++sequence),$:id=>elements.get(id),t:(key,args={})=>key+(args.reason?': '+args.reason:''),showPopup:()=>{},console});
 vm.runInContext(fs.readFileSync(path.join(root,'static/browser_sources.js'),'utf8'),ctx);
 vm.runInContext('setupBrowserSources()',ctx);
 return {ctx,window,document,clock,elements,requests,state,dispatch,run:code=>vm.runInContext(code,ctx),attach(api){vm.runInNewContext(fs.readFileSync(path.join(root,'browser_helper/bridge.js'),'utf8'),{window,document,location,chrome:{runtime:{sendMessage:message=>api.message(message),getManifest:()=>({version:'0.8.1'})}},Date:{now:()=>clock.now},setTimeout,clearTimeout,console});},gesture(){dispatch('pointerdown',{isTrusted:true});}};
}
module.exports={browser,page};
if(require.main===module)(async()=>{
 const checks=[],failures=[];async function test(name,fn){try{await fn();checks.push(name);}catch(error){failures.push({name,error:error.stack});}}
 await test('worker accepts the authenticated top-level sender URL when Tab.url is absent',async()=>{assert.equal((await browser().message({action:'capabilities'}))?.ok,true);});
 await test('worker rejects a local iframe and remote sender',async()=>{const b=browser();assert.equal(await b.message({action:'capabilities'},{frameId:1,url:local,tab:{id:1,url:local}}),undefined);assert.equal(await b.message({action:'capabilities'},{frameId:0,url:'https://evil.example/',tab:{id:1,url:local}}),undefined);});
 await test('grouped and pinned tabs use the real createSplit API and a verified pair',async()=>{for(const options of [{group:24},{pinned:true}]){const b=browser(options),reply=await b.message({action:'openSplit',url:target});assert.equal(reply?.ok,true);assert.equal(b.calls.filter(c=>c[0]==='split').length,1);assert.equal(b.tabsState.get(1).splitViewId,b.tabsState.get(8).splitViewId);}});
 await test('an installed helper without the split API creates no tab',async()=>{const b=browser({supported:false}),sender={frameId:0,url:local,tab:{id:1,url:local}},reply=await b.message({action:'openSplit',url:target},sender);assert.equal(reply.code,'split_unsupported');assert.equal(b.calls.length,0);});
 await test('a policy rejection reports the reason and retry reuses its standalone helper tab',async()=>{const b=browser({rejectSplit:true}),sender={frameId:0,url:local,tab:{id:1,url:local}};for(let i=0;i<2;i++){const reply=await b.message({action:'openSplit',url:target},sender);assert.equal(reply.ok,false);assert.equal(reply.mode,'tab');assert.match(reply.message,/policy/);}assert.equal(b.calls.filter(c=>c[0]==='create').length,1);});
 await test('API success without matching actual split IDs is not reported as a split',async()=>{const reply=await browser({unconfirmed:true}).message({action:'openSplit',url:target});assert.equal(reply?.ok,false);assert.equal(reply?.code,'split_not_created');});
 await test('a late content script reconnects after the initial page probe was missed',async()=>{const p=page(),b=browser();await wait(80);assert.equal(p.run('browserSources.connected'),false);p.attach(b);p.document.readyState='complete';p.dispatch('DOMContentLoaded');await wait(30);assert.equal(p.run('browserSources.nativeSplit'),true);});
 await test('a real source selection automatically opens one verified native pair',async()=>{const p=page(),b=browser();p.attach(b);p.gesture();p.document.readyState='complete';p.dispatch('DOMContentLoaded');await wait(20);await p.run(`offerBrowserSource({url:${JSON.stringify(target)},code:'frame_denied'},1)`);assert.equal(b.calls.filter(c=>c[0]==='split').length,1);assert.match(p.elements.get('browserSourceExplanation').textContent,/^splitOpened/);});
 await test('source checks taking over 30 seconds retain the initiating real gesture',async()=>{const p=page(),b=browser();p.attach(b);p.gesture();p.clock.now+=45000;await p.run(`offerBrowserSource({url:${JSON.stringify(target)},code:'frame_denied'},1)`);assert.equal(b.calls.filter(c=>c[0]==='split').length,1);});
 await test('manual retry reprobes an extension connected after the first miss',async()=>{const p=page(),b=browser();await wait(80);p.attach(b);p.gesture();p.run(`browserSources.url=${JSON.stringify(target)}`);await p.elements.get('openSourceSplit').click();assert.equal(b.calls.filter(c=>c[0]==='split').length,1);});
 await test('an old loaded helper is identified instead of being shown as ready',async()=>{const p=page(),b=browser(),message=b.message;b.message=async(...args)=>{const reply=await message(...args);if(args[0].action==='capabilities')delete reply.helperVersion;return reply;};p.attach(b);p.gesture();await p.run(`offerBrowserSource({url:${JSON.stringify(target)},code:'frame_denied'},1)`);assert.equal(p.run('browserSources.outdated'),true);assert.match(p.elements.get('browserSourceCapability').textContent,/splitHelperOutdated/);assert.equal(b.calls.length,0);});
 await test('background loads without gestures cannot create an automatic split',async()=>{const p=page(),b=browser();p.attach(b);await p.run(`offerBrowserSource({url:${JSON.stringify(target)},code:'frame_denied'},1)`);assert.equal(b.calls.filter(c=>c[0]==='create').length,0);assert.equal(p.elements.get('browserSourceExplanation').textContent,'splitGestureExpired');});
 await test('late capability responses cannot open a source from a previous entry',async()=>{const p=page(),b=browser();p.gesture();const offered=p.run(`offerBrowserSource({url:${JSON.stringify(target)},code:'frame_denied'},1)`);p.state.frameEpoch=2;p.attach(b);p.document.readyState='complete';p.dispatch('DOMContentLoaded');await offered;await wait(20);assert.equal(b.calls.filter(c=>c[0]==='create').length,0);});
 await test('readable image thumbnails still offer a split when the original site denies embedding',async()=>{
  const {boot,until}=require('./interaction_harness.cjs');
  const h=boot({fetch:async(url,request,fixture)=>{const u=new URL(url,local),data=fixture.respond(url,request);if(u.pathname.startsWith('/api/images/')&&u.searchParams.get('provider')==='google')Object.assign(data,{mode:'images',provider:'google',images:[{url:'https://example.org/synthetic-image.jpg',thumbnail:'https://example.org/synthetic-thumb.jpg',title:'Synthetic image'}],source_url:target,frame_check:{url:target,can_try:false,code:'frame_denied'}});return {ok:true,status:200,json:async()=>data};}});
  await until(()=>h.run('!state.restoring&&!!state.article'),'bootstrap');h.run('state.prefs.browser_images=false');
  await h.run("act({type:'provider',provider:'google'})");assert.equal(h.el('browserSourceFallback').hidden,false);assert.equal(h.el('openSourceTab').getAttribute('href'),target);assert.equal(h.run('state.currentImages.length'),1);
 });
 console.log(JSON.stringify({passed:!failures.length,checks,failures}));process.exit(failures.length?1:0);
})().catch(error=>{console.error(error.stack);process.exit(1);});
