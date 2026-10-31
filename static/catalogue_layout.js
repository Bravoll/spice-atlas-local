"use strict";
/* Browser-local layout preferences; temporary split/narrow changes do not replace the normal layout. */
const catalogueLayout={width:252,collapsed:false,context:null,temporary:null,drag:null};
const catalogueLayoutKey='spice-atlas-catalogue-layout-v1';
function catalogueContext(){return document.body.dataset.nativeSplit==='true'?'split':window.innerWidth<=900?'narrow':'normal';}
function catalogueCollapsed(){return catalogueLayout.context==='normal'?catalogueLayout.collapsed:catalogueLayout.temporary??true;}
function catalogueMaxWidth(){return Math.max(190,Math.min(420,(window.innerWidth||1363)-40));}
function persistCatalogueLayout(){try{window.localStorage?.setItem(catalogueLayoutKey,JSON.stringify({width:catalogueLayout.width,collapsed:catalogueLayout.collapsed}));}catch{}}
function renderCatalogueLayout(){
 const context=catalogueContext();if(context!==catalogueLayout.context){catalogueLayout.context=context;catalogueLayout.temporary=null;}
 const collapsed=catalogueCollapsed(),width=Math.max(190,Math.min(catalogueMaxWidth(),catalogueLayout.width)),header=document.querySelector('.site-header').getBoundingClientRect();
 document.documentElement.style.setProperty('--catalogue-width',width+'px');document.documentElement.style.setProperty('--catalogue-top',(header.bottom||header.height)+'px');
 document.body.dataset.catalogueCollapsed=String(collapsed);document.body.dataset.catalogueOverlay=String(context==='narrow'||context==='split'&&window.innerWidth<=900);
 $('toggleCatalogue').setAttribute('aria-expanded',String(!collapsed));$('toggleCatalogue').title=t(collapsed?'catalogueShow':'catalogueHide');
 $('cataloguePanel').setAttribute('aria-hidden',String(collapsed));$('cataloguePanel').toggleAttribute('inert',collapsed);
 $('catalogueDivider').setAttribute('aria-label',t('catalogueResize'));$('catalogueDivider').title=t('catalogueResizeHelp');$('catalogueDivider').setAttribute('aria-valuenow',String(width));$('catalogueDivider').setAttribute('aria-valuemax',String(catalogueMaxWidth()));
 $('catalogueBackdrop').hidden=collapsed||document.body.dataset.catalogueOverlay!=='true';$('catalogueBackdrop').setAttribute('aria-label',t('catalogueHide'));
 if(typeof scheduleNavigator==='function')scheduleNavigator();
}
function toggleCatalogue(force){
 const collapsed=typeof force==='boolean'?force:!catalogueCollapsed();
 if(catalogueLayout.context==='normal'){catalogueLayout.collapsed=collapsed;persistCatalogueLayout();}else catalogueLayout.temporary=collapsed;
 renderCatalogueLayout();if(collapsed)$('toggleCatalogue').focus();
}
function setCatalogueWidth(value){const width=Number(value);if(!Number.isFinite(width))return;catalogueLayout.width=Math.round(Math.max(190,Math.min(catalogueMaxWidth(),width)));persistCatalogueLayout();renderCatalogueLayout();}
function setupCatalogueLayout(){
 try{const value=JSON.parse(window.localStorage?.getItem(catalogueLayoutKey)||'null');if(value&&Number.isFinite(value.width))catalogueLayout.width=Math.max(190,Math.min(420,value.width));if(typeof value?.collapsed==='boolean')catalogueLayout.collapsed=value.collapsed;}catch{}
 $('toggleCatalogue').addEventListener('click',()=>toggleCatalogue());$('catalogueBackdrop').addEventListener('click',()=>toggleCatalogue(true));
 $('catalogueDivider').addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;event.preventDefault();catalogueLayout.drag={x:event.clientX,width:catalogueLayout.width};document.body.dataset.catalogueDragging='true';$('catalogueDivider').setPointerCapture?.(event.pointerId);});
 window.addEventListener('pointermove',event=>{if(catalogueLayout.drag)setCatalogueWidth(catalogueLayout.drag.width+event.clientX-catalogueLayout.drag.x);});
 const finish=()=>{catalogueLayout.drag=null;delete document.body.dataset.catalogueDragging;};window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
 $('catalogueDivider').addEventListener('dblclick',()=>setCatalogueWidth(252));
 $('catalogueDivider').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();setCatalogueWidth(event.key==='Home'?252:catalogueLayout.width+(event.key==='ArrowRight'?16:-16));});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.dataset.catalogueOverlay==='true'&&!catalogueCollapsed()&&!document.querySelector('dialog[open]'))toggleCatalogue(true);});
 window.addEventListener('resize',renderCatalogueLayout);renderCatalogueLayout();
}
