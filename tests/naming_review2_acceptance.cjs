const assert=require('node:assert/strict'),{boot,until,delay}=require('./interaction_harness.cjs');
(async()=>{
 const h=boot();await until(()=>h.run('!state.restoring&&!!state.article'),'bootstrap');
 h.run(`state.immersive=true;readingContext.phase='ready';state.mode='full';state.lang='original';$('articleBody').innerHTML='<h2 id="parent">Parent</h2><p>Text</p><h3><span id="child">Child</span></h3><p>Text</p>';state.article.toc=[{id:'parent',title:'Parent',level:2},{id:'child',title:'Child',level:3}];updateReadingOutline()`);
 h.el('readingOutlineLinks').querySelector('a span').click();await delay(25);assert.equal(h.run('readingContext.pinned'),'parent');assert.equal(h.el('readingOutlineLinks').querySelector('a[aria-current]').getAttribute('href'),'#parent');
 h.run('scheduleReadingSection()');await delay(25);assert.equal(h.run('state.readingSection'),'parent');
 h.el('main').dispatchEvent(new h.window.Event('wheel'));assert.equal(h.run('readingContext.pinned'),null);
 h.run(`readingContext.pinned='parent';readingEntryStart()`);assert.equal(h.run('readingContext.pinned'),null);
 h.run(`state.entry={...state.entry,name_zh:'',name_en:'',name:'Piper raretaxon',english:'Piper raretaxon',scientific:'Piper raretaxon',scientific_en:'Piper raretaxon',name_status:{zh:'missing',en:'missing'},name_provenance:{revision:'test',zh:null,en:null,taxonomy:{name:'GBIF',url:'https://www.gbif.org/species/123'},checked_at:'2026-10-31T00:00:00Z'}};renderNameplates()`);
 assert.equal(h.el('chineseNameplate').hidden,true);assert.equal(h.el('specimenTitle').textContent,'Piper raretaxon');assert.equal(h.el('specimenTitle').lang,'la');assert.equal(h.el('nameAvailability').hidden,false);
 assert.equal(h.el('nameEvidence').hidden,false);assert.ok(h.el('nameEvidenceRows').innerHTML.includes('https://www.gbif.org/species/123'));
 console.log(JSON.stringify({passed:true,checks:['nested chapter label selects exact target','explicit parent selection survives automatic child visibility','manual scrolling resumes section tracking','entry change clears selection pin','missing names have one scientific fallback and a visible note','name evidence retains source links']}));process.exit(0);
})().catch(e=>{console.error(e.stack);process.exit(1)});
