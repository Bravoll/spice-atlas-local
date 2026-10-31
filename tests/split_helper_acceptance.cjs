const assert=require('node:assert/strict'),{allowedSearch,localAtlas,openNativeSplit,queuedSplit}=require('../browser_helper/background.js'),{browser}=require('./browser_helper_bridge_acceptance.cjs');
function api({split=-1,pair,createdSplit=7,supported=true}={}){
 const result=browser({supported,unconfirmed:createdSplit===-1});result.tabsState.get(1).splitViewId=split;
 if(pair){result.storage.session.set({'atlas-pair-1':pair});result.tabsState.set(pair,{id:pair,index:5,windowId:2,groupId:-1,pinned:false,splitViewId:split});}
 return result;
}
(async()=>{
 const tab={id:1,url:'http://127.0.0.1:8765/?entry=parsley'},url='https://www.google.com/search?tbm=isch&q=parsley';
 for(const bad of ['https://evil.example/','https://user@www.google.com/search?q=x','http://www.google.com/search?q=x','https://www.google.com:8443/search?q=x','https://127.0.0.1/'])assert.equal(allowedSearch(bad),null);
 assert.equal(localAtlas('https://unrelated.example/'),false);assert.equal(localAtlas(tab.url),true);
 let bridge=api();assert.equal((await openNativeSplit(bridge,tab,url)).ok,true);assert.equal(bridge.calls[0][1].active,false);assert.equal(bridge.calls[0][1].index,5);assert.equal(bridge.calls.find(c=>c[0]==='split')[1].join(','),'1,8');
 bridge=api({supported:false});assert.equal((await openNativeSplit(bridge,tab,url)).code,'split_unsupported');assert.equal(bridge.calls.length,0);
 bridge=api({split:7});assert.equal((await openNativeSplit(bridge,tab,url)).code,'existing_user_split');assert.equal(bridge.calls.length,0);
 bridge=api({split:7,pair:8});assert.equal((await openNativeSplit(bridge,tab,url)).reused,true);assert.equal(bridge.calls[0][0],'update');
 bridge=api({createdSplit:-1});assert.equal((await openNativeSplit(bridge,tab,url)).ok,false);
 let active=0,maxActive=0;bridge=api();const get=bridge.tabs.get;bridge.tabs.get=async id=>{if(id!==1)return get(id);active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return get(id);};const second='https://image.baidu.com/search/index?word=parsley';await Promise.all([queuedSplit(bridge,tab,url),queuedSplit(bridge,tab,second)]);assert.equal(maxActive,1);assert.equal(bridge.calls.filter(c=>c[0]==='create').length,1);assert.equal(bridge.calls.at(-1)[2].url,second);
 console.log(JSON.stringify({passed:true,checks:['split helper rejects unapproved URL credentials protocol and port','split helper accepts only local Atlas tabs','native split creation pairs next to the owning Atlas tab','missing browser API performs no pretend split','existing user split is not replaced','helper-owned split is reused and missing split result is reported','rapid split requests serialize per owning tab']}));
})().catch(error=>{console.error(error.stack);process.exit(1);});
