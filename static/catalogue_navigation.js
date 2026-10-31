"use strict";
const catalogNav={treeOffset:0,treeLimit:6,treeTotal:0,treeBusy:false,pendingTree:false,pendingEntries:false,resizeTimer:0,held:new Set()};
function configuredShortcuts(){return {tree_previous:'[',tree_next:']',entry_previous:',',entry_next:'.',...(state.prefs.shortcuts||{})};}
function refreshShortcutLabels(){const keys=configuredShortcuts();for(const [id,key,label] of [['treePrevious','tree_previous','treePrevious'],['treeNext','tree_next','treeNext'],['catalogPrevious','entry_previous','entryPrevious'],['catalogNext','entry_next','entryNext']]){const button=$(id);button.title=t(label)+' · '+keys[key];button.setAttribute('aria-label',button.title);}}
function fitCataloguePages(reload=false){
 const tree=$('catalogTreeViewport'),entries=$('catalogEntryViewport'),header=document.querySelector('.catalog-pathbar');
 const treeHeight=tree.clientHeight,entryHeight=entries.clientHeight;
 const treeLimit=treeHeight?Math.max(1,Math.min(12,Math.floor((treeHeight-(header?.offsetHeight||36))/30))):catalogNav.treeLimit;
 const sample=$('catalogList').querySelector('.catalog-item'),style=sample&&window.getComputedStyle?.(sample);
 const rowHeight=sample?(sample.getBoundingClientRect().height+(parseFloat(style?.marginTop)||0)+(parseFloat(style?.marginBottom)||0)):(window.innerHeight<=720&&window.innerWidth>760?48:54);
 const limit=entryHeight?Math.max(1,Math.min(30,Math.floor(entryHeight/rowHeight))):state.limit;
 const changedTree=treeLimit!==catalogNav.treeLimit,changedEntries=limit!==state.limit;
 catalogNav.treeLimit=treeLimit;state.limit=limit;
 if(reload&&state.version){
  if(changedTree)catalogNav.pendingTree=true;if(changedEntries)catalogNav.pendingEntries=true;
  if(catalogNav.pendingTree&&!catalogNav.treeBusy){catalogNav.pendingTree=false;loadTree();}
  if(catalogNav.pendingEntries&&!state.catalogBusy){catalogNav.pendingEntries=false;loadCatalogue();}
 }
}
function updateCatalogueRegion(data){
 $('currentLevel').textContent=state.path.at(-1)?.label||t(state.collection==='catalogue'?(state.scope==='all'?'allRecords':state.scope==='botanical'?'botanicalCatalogue':'culinaryCatalogue'):state.collection);
 $('currentLevel').title=$('currentLevel').textContent;$('catalogEntryViewport').scrollTop=0;refreshShortcutLabels();fitCataloguePages(true);
}
async function loadTreePage(){
 const epoch=++state.treeEpoch,parent=state.node||scopeRoot();catalogNav.treeBusy=true;
 const crumbs=()=>{
  const scope=state.scope==='all'?'':('<span>›</span><button type="button" data-crumb="-1">'+esc(t(state.scope==='botanical'?'botanicalCatalogue':'culinaryCatalogue'))+'</button>');
  $('catalogBreadcrumb').innerHTML='<button type="button" data-crumb="-2">'+esc(t('allRecords'))+'</button>'+scope+state.path.map((p,i)=>'<span>›</span><button type="button" data-crumb="'+i+'">'+esc(p.label)+'</button>').join('');
  $('catalogBreadcrumb').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.crumb);if(i===-2){state.scope='all';$('catalogScope').value='all';}state.path=i<0?[]:state.path.slice(0,i+1);state.node=state.path.at(-1)?.id||null;catalogNav.treeOffset=0;act({type:'browse'});}));
 };
 crumbs();if(state.collection!=='catalogue'){$('catalogTree').innerHTML='<p class="subtle-note">'+esc(t(state.collection))+'</p>';catalogNav.treeTotal=0;updateTreePager();catalogNav.treeBusy=false;return;}
 try{
  const params=new URLSearchParams({parent,language:state.locale,offset:catalogNav.treeOffset,limit:catalogNav.treeLimit,path:JSON.stringify(state.path.map(x=>x.id))});
  const result=await api('/api/catalog/nodes?'+params);if(epoch!==state.treeEpoch)return;
  catalogNav.treeTotal=result.total??result.nodes.length;
  if(catalogNav.treeOffset&&catalogNav.treeOffset>=catalogNav.treeTotal){catalogNav.treeOffset=0;return loadTreePage();}
  if(result.labels)state.path=state.path.map(row=>({...row,label:result.labels[row.id]||row.label}));crumbs();
  $('catalogTree').innerHTML=result.nodes.map(n=>'<button type="button" data-node="'+esc(n.id)+'" title="'+esc((state.locale==='zh-Hant'?n.label_hant:n.label)+(n.name_status==='scientific_only'?' · '+t('scientificCategoryOnly'):''))+'"><span>'+esc(state.locale==='zh-Hant'?n.label_hant:n.label)+'</span><small>'+esc(n.child_count?'› '+n.child_count:n.entry_count||'')+'</small></button>').join('');
  $('catalogTree').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const n=result.nodes.find(x=>x.id===b.dataset.node);if(state.path.some(p=>p.id===n.id))return;state.node=n.id;state.path.push({id:n.id,label:state.locale==='zh-Hant'?n.label_hant:n.label});state.group='all';catalogNav.treeOffset=0;act({type:'browse'});}));
  $('catalogTreeViewport').scrollTop=0;updateTreePager();revealList($('catalogTree'),'[data-node]');
 }catch(error){if(epoch===state.treeEpoch)$('catalogTree').innerHTML='<p class="subtle-note">'+esc(errorMessage(error))+'</p>';}
 finally{if(epoch===state.treeEpoch){catalogNav.treeBusy=false;updateTreePager();if(catalogNav.pendingTree){catalogNav.pendingTree=false;loadTree();}}}
}
function updateTreePager(){
 $('treePrevious').disabled=catalogNav.treeBusy||catalogNav.treeOffset===0;$('treeNext').disabled=catalogNav.treeBusy||catalogNav.treeOffset+catalogNav.treeLimit>=catalogNav.treeTotal;
 $('treePage').textContent=catalogNav.treeTotal?(catalogNav.treeOffset+1)+'–'+Math.min(catalogNav.treeOffset+catalogNav.treeLimit,catalogNav.treeTotal)+' / '+catalogNav.treeTotal:'';refreshShortcutLabels();
}
async function treePageCommand(direction){if(catalogNav.treeBusy||$(direction>0?'treeNext':'treePrevious').disabled)return;await act({type:'treePage',direction});}
function installPointerHold(bar,region){
 if(!bar||!region)return;let held=null,placeholder=null,releaseRevision=0;
 const release=()=>{if(!held)return;const before=bar.getBoundingClientRect();held=null;catalogNav.held.delete(release);releaseRevision++;bar.removeAttribute('data-pointer-held');for(const key of ['position','left','top','right','bottom','width','height','zIndex','margin'])bar.style[key]='';placeholder?.remove();placeholder=null;const target=bar.getBoundingClientRect();if(motionLevel()&&(Math.abs(before.top-target.top)>1||Math.abs(before.left-target.left)>1))motionEffect(bar,[{transform:`translate(${before.left-target.left}px,${before.top-target.top}px)`},{transform:'none'}],motionLevel()===3?330:180);};
 const hold=event=>{if(held||event.pointerType&&event.pointerType!=='mouse')return;held=bar.getBoundingClientRect();placeholder=document.createElement('div');placeholder.className='pager-placeholder';placeholder.style.height=held.height+'px';placeholder.style.width=held.width+'px';bar.parentNode.insertBefore(placeholder,bar);bar.dataset.pointerHeld='true';bar.style.position='fixed';bar.style.left=held.left+'px';bar.style.top=held.top+'px';bar.style.right='auto';bar.style.bottom='auto';bar.style.width=held.width+'px';bar.style.height=held.height+'px';bar.style.zIndex='25';bar.style.margin='0';catalogNav.held.add(release);};
 bar.addEventListener('pointerenter',hold);bar.addEventListener('pointerleave',release);
 const clamp=()=>{if(!held)return;const box=region.getBoundingClientRect(),top=Math.min(held.top,box.bottom-held.height);bar.style.top=top+'px';if(top+held.height<Math.max(0,box.top))release();};
 region.addEventListener('scroll',clamp,{passive:true});window.addEventListener('scroll',clamp,{passive:true});window.addEventListener('resize',()=>{release();});window.addEventListener('pagehide',release);
}
function setupCatalogueNavigation(){
 $('treePrevious').addEventListener('click',()=>treePageCommand(-1));$('treeNext').addEventListener('click',()=>treePageCommand(1));
 installPointerHold($('entryPager'),$('catalogEntryRegion'));installPointerHold($('treePager'),$('catalogTreeViewport'));
 for(const id of ['catalogTreeViewport','catalogEntryViewport'])$(id).addEventListener('scroll',()=>{saveJourneyPosition();rememberView();},{passive:true});
 fitCataloguePages();if(window.ResizeObserver){const observer=new window.ResizeObserver(()=>{clearTimeout(catalogNav.resizeTimer);catalogNav.resizeTimer=setTimeout(()=>fitCataloguePages(true),90);});observer.observe($('catalogTreeViewport'));observer.observe($('catalogEntryViewport'));}
 refreshShortcutLabels();
}
