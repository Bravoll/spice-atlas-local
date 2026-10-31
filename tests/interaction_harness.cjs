/* Synthetic browser environment for interaction tests; never used by the application. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require(process.env.SPICE_LINKEDOM_PATH||'linkedom'),{createFixture}=require('./fixture_service.cjs');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){for(let i=0;i<350;i++){if(check())return;await delay(10);}throw new Error('Timed out: '+label);}
function boot(options={}){
 const base=createFixture(root),storage=new Map(),motion={auto:true,effects:[]};
 const fixture={requests:base.requests,get prefs(){return base.prefs;},changeHealth(){base.changeHealth();},respond(url,options){
  const result=base.respond(url,options),u=new URL(url,'http://127.0.0.1');
  if(u.pathname==='/api/catalog'){
   const offset=Number(u.searchParams.get('offset')||0),total=125,scope=u.searchParams.get('scope')||'all';
   return {...result,total,offset,has_more:offset+30<total,entries:Array.from({length:Math.max(0,Math.min(30,total-offset))},(_,i)=>({id:scope+'-'+(offset+i),name_en:'Fixture plant '+(offset+i),scientific:'Fixturea example',scientific_en:'Fixturea example',name_zh:'测试条目 '+(offset+i),english:'Fixture plant '+(offset+i)}))};
  }
  return result;
 }};
 const {window,document}=parseHTML(fs.readFileSync(path.join(root,'static/index.html'),'utf8'));let active=document.body;
 Object.defineProperty(document,'activeElement',{configurable:true,get(){return active;}});
 Object.defineProperties(window.HTMLSelectElement.prototype,{options:{configurable:true,get(){return [...this.querySelectorAll('option')];}},selectedOptions:{configurable:true,get(){return this.options.filter(x=>x.selected);}},value:{configurable:true,get(){return (this.querySelector('option[selected]')||this.querySelector('option'))?.getAttribute('value')||'';},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.getAttribute('value')===String(v));}}});
 Object.defineProperty(window.HTMLOptionElement.prototype,'selected',{configurable:true,get(){return this.hasAttribute('selected');},set(v){this.toggleAttribute('selected',v);}});
 Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(v){this.toggleAttribute('checked',v);}});
 window.HTMLElement.prototype.focus=function(){active=this;};
 window.HTMLElement.prototype.showModal=function(){this.open=true;this.setAttribute('open','');active=this;};
 window.HTMLElement.prototype.show=function(){this.open=true;this.setAttribute('open','');};
 window.HTMLElement.prototype.close=function(){this.open=false;this.removeAttribute('open');active=document.body;this.dispatchEvent(new window.Event('close'));};
 window.HTMLElement.prototype.scrollIntoView=function(){};
 window.HTMLElement.prototype.getBoundingClientRect=function(){let x=0,y=0,width=500,height=40;if(this.id==='main'){x=252;y=102;width=1111;height=834;}if(this.classList.contains('site-header')){width=1363;height=102;}if(this.dataset.orderId)y=[...this.parentElement.children].indexOf(this)*80;return{x,y,width,height,top:y,left:x,right:x+width,bottom:y+height};};
 window.HTMLElement.prototype.animate=function(frames,options){
  let resolve,reject;const effect={element:this,frames,options,playState:'running',finished:new Promise((a,b)=>{resolve=a;reject=b;}),finish(){if(this.playState==='running'){this.playState='finished';resolve();}},cancel(){if(this.playState==='running'){this.playState='idle';reject(new Error('cancelled'));}}};motion.effects.push(effect);if(motion.auto)setTimeout(()=>effect.finish(),0);return effect;
 };
 window.innerWidth=1363;window.innerHeight=936;window.scrollY=0;window.scrollTo=()=>{};window.matchMedia=()=>({matches:false,addEventListener(){}});window.getComputedStyle=()=>({paddingLeft:'54px',position:'static'});
 const viewport=document.getElementById('frameViewport');Object.defineProperty(viewport,'clientWidth',{configurable:true,get(){return document.getElementById('frameContainer').dataset.expanded==='true'?1328:420;}});Object.defineProperty(viewport,'clientHeight',{configurable:true,get(){return 700;}});
 const history={state:null,replaceState(value){this.state=value;},pushState(value){this.state=value;}};
 const ctx=vm.createContext({window,document,fetch:async(url,request)=>options.fetch?options.fetch(url,request,fixture):({ok:true,status:200,json:async()=>fixture.respond(url,request)}),navigator:{languages:['en-GB'],language:'en-GB'},location:{href:'http://127.0.0.1:8765/',search:'',reload(){}},history,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},URL,URLSearchParams,AbortController,TextDecoder,TextEncoder,ReadableStream,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:cb=>setTimeout(cb,0),console});
 for(const file of ['i18n.js','ui_strings.js','interactions.js','experience.js','notifications.js','text_motion.js','source_board.js','catalogue_navigation.js','remote_cache.js','wiki_reader.js','font_catalog.js','nameplates.js','catalogue_layout.js','browser_sources.js','reading_mode.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'static',file),'utf8'),ctx);
 return {ctx,window,document,fixture,motion,storage,el:id=>document.getElementById(id),run:code=>vm.runInContext(code,ctx),click(id){document.getElementById(id).click();},key(key,target=document.body,options={}){const e=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(e,{key,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,isComposing:false,...options});target.dispatchEvent(e);return e;}};
}
module.exports={boot,until,delay};
