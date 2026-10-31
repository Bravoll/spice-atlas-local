"use strict";
const identityLanguageNames={en:{en:'English',zh:'英文',ja:'英語',fr:'Anglais',de:'Englisch',es:'Inglés',ko:'영어',ru:'Английский',pt:'Inglês'},zh:{en:'Chinese',zh:'中文',ja:'中国語',fr:'Chinois',de:'Chinesisch',es:'Chino',ko:'중국어',ru:'Китайский',pt:'Chinês'},ja:{en:'Japanese',zh:'日文',ja:'日本語'},fr:{en:'French',zh:'法文',fr:'Français'},de:{en:'German',zh:'德文',de:'Deutsch'},es:{en:'Spanish',zh:'西班牙文',es:'Español'},ko:{en:'Korean',zh:'韩文',ko:'한국어'},ru:{en:'Russian',zh:'俄文',ru:'Русский'},pt:{en:'Portuguese',zh:'葡萄牙文',pt:'Português'},la:{en:'Latin scientific name',zh:'拉丁学名'}};
function identityLanguagePair(locale){return String(locale).startsWith('en')?['en','zh-Hans']:[locale,'en'];}
function languageLabel(code){const names=identityLanguageNames[fontLanguage(code)]||{};return names[fontLanguage(state.locale)]||names.en||code;}
function identityName(entry,code){
 if(entry.name_status?.[code.startsWith('zh')?'zh':code.startsWith('en')?'en':code]==='missing')return null;
 if(code.startsWith('zh'))return code==='zh-Hant'?(entry.name_zh_hant||entry.name_zh||(/\p{Script=Han}/u.test(entry.name||'')?entry.name:null)):entry.name_zh||(/\p{Script=Han}/u.test(entry.name||'')?entry.name:null);
 if(code.startsWith('en'))return entry.name_en||entry.spoken_english||entry.english;
 return entry.localized_names?.[code]||entry.localized_names?.[fontLanguage(code)]||null;
}
function renderNameplates(){
 if(!state.entry)return;const e=state.entry,cn=state.nameChineseStyle||state.prefs.name_chinese_style||'botanical',west=state.nameWesternStyle||state.prefs.name_western_style||'book';
 $('chineseNameStyle').value=cn;$('westernNameStyle').value=west;$('nameTextKind').value=west;$('nameTextKind').setAttribute('aria-label',t('nameContentLabel'));$('chineseNameplate').dataset.style=cn;$('westernNameplate').dataset.style=west;
 const pair=identityLanguagePair(state.locale),primaryIsEnglish=pair[0]==='en',other=primaryIsEnglish?pair[1]:pair[0];
 const otherText=identityName(e,other),englishText=west==='inscription'?(e.scientific_en||e.scientific):identityName(e,'en');
 $('chineseName').textContent=otherText||e.scientific_en||e.scientific||identityName(e,'en')||'';$('chineseName').lang=otherText?other:'la';
 $('specimenTitle').textContent=englishText||e.scientific_en||e.scientific||'';$('specimenTitle').lang=west==='inscription'||!englishText?'la':'en';$('scientific').hidden=west==='inscription'||!englishText;
 $('chineseNameplate').hidden=!otherText&&!englishText;
 const slots=[['chineseNameplate','chineseName','chineseNameLanguage','nameFontChinese',other,cn==='scroll'?'kaiti':other==='zh-Hant'?'noto-serif-tc':'noto-serif-sc'],['westernNameplate','specimenTitle','westernNameLanguage','nameFontWestern','en',west==='inscription'?'georgia':'cormorant']];
 for(const [plate,title,label,picker,code,fallback] of slots){const lang=fontLanguage(code),value=state.nameFonts?.[code]??state.nameFonts?.[lang]??state.prefs.name_fonts?.[code]??state.prefs.name_fonts?.[lang]??'';$(plate).dataset.language=code;$(label).textContent=$(title).lang==='la'?t('scientificNameChoice'):languageLabel($(title).lang);$(plate).title=(!identityName(e,code)?t('nameMissing',{language:languageLabel(code)})+' · ':'')+t('styleNote');fillFontSelect($(picker),value);$(picker).setAttribute('aria-label',t('fontFamilyLabel')+' · '+languageLabel(code));$(title).style.fontFamily=cssFontFamily(value||fallback);}
 const holder=document.querySelector('.hero-nameplates');if(primaryIsEnglish){holder.appendChild($('westernNameplate'));holder.appendChild($('chineseNameplate'));}else{holder.appendChild($('chineseNameplate'));holder.appendChild($('westernNameplate'));}
 renderNameEvidence(e);
}
function renderNameEvidence(entry){
 const unavailable=['zh','en'].filter(code=>entry.name_status?.[code]==='missing').map(languageLabel);$('nameAvailability').hidden=!unavailable.length;$('nameAvailability').textContent=unavailable.length?t('nameAuditMissing',{languages:unavailable.join(' / ')}):'';
 const provenance=entry.name_provenance||{},rows=[['zh',languageLabel('zh')],['en',languageLabel('en')],['taxonomy',t('taxonomyEvidence')]].filter(([key])=>provenance[key]);$('nameEvidence').hidden=!rows.length;
 $('nameEvidenceRows').innerHTML=rows.map(([key,label])=>{const source=provenance[key];return '<div><strong>'+esc(label)+'</strong> '+(source.url?ext(source.url,source.name):esc(source.name||''))+(source.record_id?' · '+esc(source.record_id):'')+'</div>';}).join('')+(provenance.checked_at?'<small>'+esc(t('nameCheckedAt'))+' · '+esc(formatDate(provenance.checked_at))+'</small>':'');
}
function updateOutlinePresentation(){const outline=$('readerOutline');if(outline)outline.hidden=!!state.immersive||state.source==='other'||!$('outline').querySelector('a');if(typeof updateReadingOutline==='function')updateReadingOutline();}
function setupNameplates(){
 $('nameTextKind').addEventListener('change',()=>act({type:'nameWesternStyle',style:$('nameTextKind').value}));
 $('chineseNameStyle').addEventListener('change',()=>act({type:'nameChineseStyle',style:$('chineseNameStyle').value}));$('westernNameStyle').addEventListener('change',()=>act({type:'nameWesternStyle',style:$('westernNameStyle').value}));
 for(const [id,plate] of [['nameFontChinese','chineseNameplate'],['nameFontWestern','westernNameplate']])$(id).addEventListener('change',()=>act({type:'nameFont',language:$(plate).dataset.language,font:$(id).value}));
}
