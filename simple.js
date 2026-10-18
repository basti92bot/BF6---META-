"use strict";
(() => {
const $ = id => document.getElementById(id);
const safe = val => String(val ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = x => String(x||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const fmt = (n,d=1) => Number.isFinite(Number(n)) ? Number(n).toLocaleString("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d}) : "–";
const state = {mode:"mp",view:"popular",trend:null,modes:null,catalog:null,builds:null,status:null,weaponClass:"all",search:"",focus:null};
const cur = () => state.modes?.modes[state.mode];
const cat = id => state.catalog?.classes.find(c=>c.id===id);
const findCat = n => state.catalog?.classes.find(c=>c.weapons.some(w=>norm(w)===norm(n)));
const findBuild = n => state.builds?.recommendations.find(w=>norm(w.name)===norm(n));
const modeRecords = () => state.mode==="mp" ? [...(state.trend?.popular||[]),...(state.trend?.meta||[])] : state.mode==="br" ? (cur()?.weapons||[]) : [];
const findTracked = n => modeRecords().find(w=>norm(w.name)===norm(n));
const findRapid = n => cur()?.recommendations?.find(w=>norm(w.name)===norm(n));
function picture(name,c){
  const exact=state.catalog?.exactImages?.[name], imageUrl=exact||c?.image;
  if(!imageUrl)return '<div class="picture"><span>BF6</span></div>';
  return '<div class="picture"><img src="'+safe(imageUrl)+'" loading="lazy" alt="'+safe(exact?"Waffenmotiv "+name:"Klassenmotiv "+(c?.label||"BF6"))+'" onerror="this.hidden=true"><i>'+(exact?"WAFFENMOTIV":"KLASSENMOTIV")+'</i></div>';
}
function row(item,i,type){
  const name=item.name,c=cat(item.category)||findCat(name);
  const isRapid=state.mode==="rapid";
  let position=isRapid?"•":String(i+1)+".";
  let right='<span class="row-action">DETAILS →</span>';
  if(type==="pick")right='<span class="row-label">'+(state.mode==="br"?"PICK-RATE ELITE":"PICK-RATE")+'</span><span class="row-rate">'+fmt(item.pickRate)+' %</span><span class="meter"><span style="width:'+Math.min(100,Math.max(0,Number(item.pickRate))*7.5)+'%"></span></span>';
  if(type==="score")right='<span class="row-label">META-SCORE</span><span class="row-rate small">'+Math.round(item.metaScore)+'/100</span><span class="meter"><span style="width:'+Math.min(100,Number(item.metaScore))+'%"></span></span>';
  if(type==="kpm")right='<span class="row-label">KILLS/MIN ELITE</span><span class="row-rate small">'+fmt(item.kpm,2)+'</span><span class="row-action">WIN '+fmt(item.winRate)+' %</span>';
  if(type==="recommendation")right='<span class="row-label">EINSCHÄTZUNG</span><span class="row-action">DETAILS →</span>';
  if(type==="class"){
    const tracked=findTracked(name);
    const estimated=isRapid&&findRapid(name);
    if(tracked?.pickRate!=null)right='<span class="row-label">'+(state.mode==="br"?"PICK-RATE ELITE":"PICK-RATE")+'</span><span class="row-rate small">'+fmt(tracked.pickRate)+' %</span>';
    else if(estimated)right='<span class="row-label">EMPFOHLEN</span><span class="row-action">GUIDE →</span>';
  }
  return '<button class="weapon-row" type="button" data-weapon="'+safe(name)+'">'+
   '<span class="row-position">'+position+'</span>'+picture(name,c)+
   '<span><strong class="row-name">'+safe(name)+'</strong><span class="row-class">'+safe(c?.label||"Waffe")+'</span></span>'+
   '<span>'+right+'</span></button>';
}
function popList(){
  if(state.mode==="rapid"){
    $("popular-list").innerHTML='<div class="empty"><strong>Für Rapid Royale sind keine verifizierten Waffen-Pick-Rates verfügbar.</strong><p>Keine Multiplayer- oder REDSEC-Elite-Zahlen als Rapid-Nutzung ausgeben. Unter „Beste Waffen“ findest du stattdessen begründete Empfehlungen.</p><a href="'+safe(cur().source)+'" target="_blank" rel="noopener noreferrer">Offizielle Rapid-Royale-Regeln ↗</a></div>';
    return;
  }
  const list=state.mode==="mp" ? [...state.trend.popular] : [...cur().weapons];
  list.sort((a,b)=>b.pickRate-a.pickRate);
  $("popular-list").innerHTML=list.map((w,i)=>row(w,i,"pick")).join("");
}
function bestList(){
  let items,kind;
  if(state.mode==="mp"){items=[...state.trend.meta].sort((a,b)=>b.metaScore-a.metaScore);kind="score";}
  else if(state.mode==="br"){items=[...cur().weapons].sort((a,b)=>b.kpm-a.kpm);kind="kpm";}
  else {items=cur().recommendations;kind="recommendation";}
  $("best-list").innerHTML=items.map((w,i)=>row(w,i,kind)).join("");
}
function classList(){
  const options=[{id:"all",label:"Alle"},...state.catalog.classes];
  $("class-filters").innerHTML=options.map(c=>'<button type="button" data-category="'+safe(c.id)+'" class="'+(state.weaponClass===c.id?"active":"")+'">'+safe(c.label)+'</button>').join("");
  const list=[];
  for(const c of state.catalog.classes){
    if(state.weaponClass!=="all"&&c.id!==state.weaponClass)continue;
    for(const name of c.weapons){if(norm(name).includes(norm(state.search)))list.push({name,category:c.id});}
  }
  list.sort((a,b)=>{
    const rankA=state.mode==="rapid" ? (findRapid(a.name)?1:0) : (findTracked(a.name)?.pickRate||0);
    const rankB=state.mode==="rapid" ? (findRapid(b.name)?1:0) : (findTracked(b.name)?.pickRate||0);
    return rankB-rankA || a.name.localeCompare(b.name,"de");
  });
  $("class-list").innerHTML=list.length?list.map((w,i)=>row(w,i,"class")).join(""):'<div class="empty">Keine passenden Waffen gefunden.</div>';
}
function sourceLinks(){
  $("source-list").innerHTML=(state.modes?.sources||[]).map(s=>'<div class="source-item"><strong>'+safe(s.name)+'</strong><span>'+safe(s.usage)+'</span><a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">Quelle öffnen ↗</a></div>').join("")+
   '<p class="disclaimer">Offizielle EA-Infos, beobachtete Matches, theoretische Schadensmodelle und subjektive Builds werden nicht zu einem gemeinsamen „Score“ vermischt. Eine Quelle kann erreichbar sein, ohne dass ihre Werte bereits aktualisiert wurden.</p>';
}
function setCopy(){
  const mode=cur();
  $("data-note").textContent=(state.mode==="rapid" ? "Rapid: Einschätzungen ohne Pick-Rates" : "Datenstand: "+state.modes.observedAt+" · Momentaufnahme") + " · Quellenprüfung täglich, Werte nicht automatisch synchronisiert";
  $("mode-note").textContent=mode.note;
  $("popular-title").textContent=state.mode==="rapid"?"Keine Rapid-Nutzungszahlen":"Am meisten gespielt";
  $("popular-label").textContent=state.mode==="rapid"?"NOCH KEINE DATEN":state.mode==="br"?"ELITE PICK-RATE":"PICK-RATE";
  $("popular-description").textContent=state.mode==="rapid"?"Die Waffen-Pick-Rates von Multiplayer und REDSEC Elite sind nicht auf Rapid Royale übertragbar.":"Die meistgenutzten Waffen in der jeweiligen Stichprobe, nicht automatisch die effektivsten.";
  $("popular-disclaimer").textContent=mode.note;
  $("best-title").textContent=state.mode==="rapid"?"Empfehlungen für Rapid Royale":state.mode==="br"?"Hohe Killrate im BR":"Beste Waffen";
  $("best-label").textContent=state.mode==="rapid"?"OHNE RANKING":state.mode==="br"?"KILLS/MIN ELITE":"META-SCORE";
  $("best-description").textContent=mode.bestExplanation;
  $("best-disclaimer").textContent=mode.note;
  for(const button of document.querySelectorAll("[data-mode]")){
    const selected=button.dataset.mode===state.mode;
    button.classList.toggle("active",selected);button.setAttribute("aria-selected",String(selected));
  }
}
function switchMode(mode){
  if(!state.modes?.modes?.[mode])return;
  state.mode=mode;
  state.search="";
  $("weapon-search").value="";
  state.weaponClass="all";
  setCopy();popList();bestList();classList();
}
function setView(view){
  state.view=view;
  for(const b of document.querySelectorAll("[data-view]")){const selected=b.dataset.view===view;b.classList.toggle("active",selected);b.setAttribute("aria-selected",String(selected));}
  for(const node of document.querySelectorAll(".view"))node.classList.toggle("active",node.id===view);
}
function detailStats(data){
  if(state.mode==="mp"){
    return data ? '<div class="info-chips">'+(data.pickRate!=null?'<span>Pick-Rate: '+fmt(data.pickRate)+' %</span>':'')+
      (data.metaScore!=null?'<span>Meta-Score: '+Math.round(data.metaScore)+'/100</span>':'')+'</div>' : '';
  }
  if(state.mode==="br"){
    return data ? '<div class="info-chips"><span>Elite Pick-Rate: '+fmt(data.pickRate)+' %</span><span>Winrate: '+fmt(data.winRate)+' %</span><span>Kills/Min: '+fmt(data.kpm,2)+'</span></div>' : '';
  }
  return '<div class="info-card"><p>Für Rapid Royale ist keine verlässliche Waffen-Pick-Rate verfügbar. Keine Werte aus anderen Modi übernommen.</p></div>';
}
function details(name){
  const c=findCat(name),build=findBuild(name),tracked=findTracked(name),rapid=findRapid(name),pic=picture(name,c);
  const attachments=build?Object.entries(build.attachments).map(([type,val])=>'<div class="attachment"><span>'+safe(type)+'</span><strong>'+safe(val)+'</strong></div>').join(""):"";
  let topMessage=state.mode==="rapid"?(rapid?rapid.reason:"Für Rapid Royale liegt noch keine spezifische Empfehlung zu dieser Waffe vor."):
    state.mode==="br"?"REDSEC-Elite-Werte. Andere Battle-Royale-Playlists können abweichen.":
    build?.pitch||"Wähle diese Waffe passend zu deinem Spielstil.";
  let buildHtml=build?
    '<h3>Community-Aufsätze (allgemein)</h3>'+attachments+
    '<p class="notice-mini">Diese Aufsätze stammen aus einem Community-Guide. Die Kombination ist nicht gesondert für '+safe(cur().title)+' und den aktuellen Patch bestätigt.</p>'+
    '<a class="linkline" target="_blank" rel="noopener noreferrer" href="'+safe(state.builds.sourceBuilds)+'">Original-Build prüfen ↗</a>':
    '<div class="info-card"><p>Kein geprüfter Build gespeichert. Fehlende Aufsätze werden nicht geschätzt.</p></div>';
  $("modal-content").innerHTML='<div class="detail-photo">'+pic+'</div><div class="detail"><span class="eyebrow">'+safe(cur().title)+' · '+safe(c?.label||"Waffe")+'</span><h2>'+safe(name)+'</h2>'+
   '<p>'+safe(topMessage)+'</p>'+detailStats(tracked)+
   '<p class="notice-mini">'+safe(cur().note)+'</p>'+
   buildHtml+
   '<h3>Modus-Quelle</h3><a class="linkline" href="'+safe(cur().source)+'" target="_blank" rel="noopener noreferrer">Daten für '+safe(cur().title)+' prüfen ↗</a></div>';
  $("modal-backdrop").hidden=false;$("weapon-modal").hidden=false;$("weapon-modal").setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");$("modal-close").focus();
}
function closeDetails(){
  $("modal-backdrop").hidden=true;$("weapon-modal").hidden=true;$("weapon-modal").setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");state.focus?.focus?.();
}
function events(){
  document.querySelector(".mode-selector").addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(b)switchMode(b.dataset.mode);});
  document.querySelector(".nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view);});
  $("class-filters").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b){state.weaponClass=b.dataset.category;classList();}});
  $("weapon-search").addEventListener("input",e=>{state.search=e.target.value;classList();});
  for(const id of ["popular-list","class-list","best-list"])
    $(id).addEventListener("click",e=>{const b=e.target.closest("[data-weapon]");if(b){state.focus=b;details(b.dataset.weapon);}});
  $("modal-close").addEventListener("click",closeDetails);
  $("modal-backdrop").addEventListener("click",closeDetails);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("weapon-modal").hidden)closeDetails();});
}
async function init(){
  events();
  try {
    const paths=["popularity","modes","catalog","meta","status"];
    const responses=await Promise.all(paths.map(name=>fetch("./data/"+name+".json",{cache:"no-store"})));
    if(responses.slice(0,4).some(r=>!r.ok))throw new Error("Waffendaten fehlen");
    [state.trend,state.modes,state.catalog,state.builds,state.status]=await Promise.all(responses.map(r=>r.ok?r.json():null));
    if(!state.modes?.modes?.rapid?.recommendations||!state.catalog?.classes?.length)throw new Error("Unvollständiger Datenbestand");
    sourceLinks();switchMode("mp");setView("popular");
  }catch(error){
    console.error("BF6 Meta: data loading failed", error);
    $("data-note").textContent="Die Daten konnten nicht geladen werden. Bitte Seite neu laden.";
    for(const id of ["popular-list","class-list","best-list"])$(id).innerHTML='<div class="empty">Daten derzeit nicht verfügbar.</div>';
  }
}
if("serviceWorker" in navigator && location.protocol!=="file:")
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
init();
})();
