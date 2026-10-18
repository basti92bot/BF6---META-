"use strict";
(() => {
const $ = id => document.getElementById(id);
const safe = str => String(str ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = str => String(str||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const fmt = (n,digits=1) => Number.isFinite(Number(n)) ? Number(n).toLocaleString("de-DE",{minimumFractionDigits:digits,maximumFractionDigits:digits}) : "–";
const state = { trend:null, catalog:null, builds:null, status:null, weaponClass:"all", search:"", focus:null };
const cat = id => state.catalog?.classes.find(c=>c.id===id);
const findCat = name => state.catalog?.classes.find(c=>c.weapons.some(w=>norm(w)===norm(name)));
const findBuild = name => state.builds?.recommendations.find(w=>norm(w.name)===norm(name));
const findTracked = name => [...(state.trend?.popular||[]),...(state.trend?.meta||[])].find(w=>norm(w.name)===norm(name));
const className = id => cat(id)?.label || "Waffe";
const attr = str => safe(str);
function picture(name, c, place="") {
  const exact = state.catalog.exactImages[name];
  const imageUrl = exact || c?.image;
  const mode = exact ? "WAFFENMOTIV" : "KLASSENBILD";
  if (!imageUrl) return '<div class="picture"><span>BF6</span></div>';
  return '<div class="picture '+place+'"><img src="'+attr(imageUrl)+'" loading="lazy" alt="'+safe(exact?"Waffenmotiv "+name:"Klassenbild "+(c?.label||"BF6"))+'" onerror="this.hidden=true"><i>'+mode+'</i></div>';
}
function row(item, i, type, name) {
  const weaponName=name||item.name, c=cat(item.category) || findCat(weaponName);
  const stat = type==="pick" ? item.pickRate : type==="score" ? item.metaScore : null;
  let side = '<span class="row-action">DETAILS →</span>';
  if(type==="pick")side='<span class="row-label">PICK-RATE</span><span class="row-rate">'+fmt(stat)+' %</span><span class="meter"><span style="width:'+Math.min(100,Number(stat)*7.5)+'%"></span></span>';
  if(type==="score")side='<span class="row-label">META-SCORE</span><span class="row-rate small">'+Math.round(stat)+'/100</span><span class="meter"><span style="width:'+Math.min(100,Number(stat))+'%"></span></span>';
  const known = findTracked(weaponName);
  if(type==="class" && known)side='<span class="row-label">PICK-RATE</span><span class="row-rate small">'+fmt(known.pickRate)+' %</span>';
  return '<button class="weapon-row" type="button" data-weapon="'+attr(weaponName)+'">'+
    '<span class="row-position">'+(i+1)+'.</span>'+picture(weaponName,c)+
    '<span><strong class="row-name">'+safe(weaponName)+'</strong><span class="row-class">'+safe(c?.label||"Ohne Klasse")+'</span></span>'+
    '<span>'+side+'</span></button>';
}
function showPopular(){
  const list = state.trend.popular.slice().sort((a,b)=>b.pickRate-a.pickRate);
  $("popular-list").innerHTML = list.map((x,i)=>row(x,i,"pick")).join("");
}
function showBest(){
  const list=state.trend.meta.slice().sort((a,b)=>b.metaScore-a.metaScore);
  $("best-list").innerHTML = list.map((x,i)=>row(x,i,"score")).join("");
}
function showClasses(){
  const cs=[{id:"all",label:"Alle"},...state.catalog.classes];
  $("class-filters").innerHTML = cs.map(c=>'<button type="button" data-category="'+attr(c.id)+'" class="'+(state.weaponClass===c.id?"active":"")+'">'+safe(c.label)+'</button>').join("");
  const list=[];
  for(const c of state.catalog.classes)if(state.weaponClass==="all"||c.id===state.weaponClass)
    for(const name of c.weapons)if(norm(name).includes(norm(state.search)))list.push({name,category:c.id});
  list.sort((a,b)=>{
    const av=findTracked(a.name)?.pickRate||0,bv=findTracked(b.name)?.pickRate||0;
    return bv-av || a.name.localeCompare(b.name,"de");
  });
  $("class-list").innerHTML = list.length ? list.map((x,i)=>row(x,i,"class")).join("") : '<div class="empty">Keine Waffen gefunden.</div>';
}
function timeString(s){
  if(!s)return "Noch keine erfolgreiche Prüfung";
  const d=new Date(s);return Number.isNaN(d.getTime())?String(s):d.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function card(title,contents,url,linkText){
  return '<article class="info-card"><h3>'+safe(title)+'</h3><p>'+safe(contents)+'</p>'+
  (url?'<p><a target="_blank" rel="noopener noreferrer" href="'+attr(url)+'">'+safe(linkText||"Quelle öffnen")+' ↗</a></p>':'')+'</article>';
}
function showUpdates(){
  const st=state.status||{}, p=st.latestPatch||{};
  $("update-list").innerHTML =
  card("Offizieller EA-Patch: "+(p.version||"unbekannt"),"Erkannter Spielstand: "+(p.announcedAt||"Datum unbestätigt")+". Die Auswertung darf erst nach Prüfung als aktuell gelten.",p.url||"https://www.ea.com/games/battlefield/battlefield-6/news","EA-Patchnotes")+
  card("Waffennutzung · Stand "+state.trend.observedAt,"Pick-Rates sind ein geprüfter Snapshot von INT.GG. Noch keine automatische Übernahme der täglichen Nutzungsdaten. Ein täglicher Quellencheck allein aktualisiert diese Werte nicht.",state.trend.detailSource,"Aktuelle Pick-Rates direkt prüfen")+
  card("Tägliche Quellenprüfung", "Letzter erfolgreicher Lauf: "+timeString(st.lastSuccessAt)+". "+(st.reviewNeeded?"Eine Prüfung der Meta-Daten ist weiterhin erforderlich.":"Kein zusätzlicher Prüfhinweis im Status."),"https://github.com/basti92bot/BF6---META-/actions","GitHub Actions öffnen")+
  card("Build-Daten", "Aufsätze stammen aus einem Community-Guide. Neue Updates können sie ungültig machen. Fehlende Aufsätze werden nicht geschätzt.",state.builds?.sourceBuilds,"Build-Quelle ansehen");
}
function details(name){
  const c=findCat(name), w=findBuild(name), st=findTracked(name), pic=picture(name,c),patch=state.status?.latestPatch?.version;
  const entries=w?Object.entries(w.attachments).map(([type,val])=>'<div class="attachment"><span>'+safe(type)+'</span><strong>'+safe(val)+'</strong></div>').join(""):"";
  $("modal-content").innerHTML='<div class="detail-photo">'+pic+'</div>'+
    '<div class="detail"><span class="eyebrow">'+safe(c?.label||"Waffendetails")+'</span><h2>'+safe(name)+'</h2>'+
    '<p>'+safe(w?.pitch||"Für diese Waffe liegt derzeit keine redaktionelle Empfehlung vor.")+'</p>'+
    '<div class="info-chips">'+(st?.pickRate!==undefined?'<span>Pick-Rate: '+fmt(st.pickRate)+' %</span>':'')+
    (st?.metaScore!==undefined?'<span>Meta-Score: '+Math.round(st.metaScore)+'/100</span>':'')+'</div>'+
    (w?'<h3>Empfohlene Aufsätze</h3>'+entries+
      '<p class="notice-mini">Guide-Stand: Patch '+safe(state.builds.patch||"unbekannt")+', aktueller Patch '+safe(patch||"unbekannt")+'. Nicht unabhängig im Spiel verifiziert.</p>'+
      '<a class="linkline" target="_blank" rel="noopener noreferrer" href="'+attr(state.builds.sourceBuilds)+'">Original-Build prüfen ↗</a>':
      '<div class="info-card"><p>Kein verlässlicher Aufsatz-Build gespeichert. Wir zeigen lieber keine erfundenen Empfehlungen.</p></div>')+
    (st?'<h3>Spieldaten</h3><p>Die Prozentwerte stammen aus einem Drittanbieter-Datensatz vom '+safe(state.trend.observedAt)+'. Sie zeigen eine Stichprobe, nicht alle BF6-Spieler.</p>':'')+
    '<a class="linkline" target="_blank" rel="noopener noreferrer" href="'+attr(state.trend.detailSource)+'">Aktuelle Waffendaten bei INT.GG ↗</a></div>';
  $("modal-backdrop").hidden=false;$("weapon-modal").hidden=false;$("weapon-modal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");$("modal-close").focus();
}
function closeDetails(){
  $("modal-backdrop").hidden=true;$("weapon-modal").hidden=true;$("weapon-modal").setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");state.focus?.focus?.();
}
function activate(tab){
  for(const b of document.querySelectorAll("[data-view]")){const selected=b.dataset.view===tab;b.classList.toggle("active",selected);b.setAttribute("aria-selected",String(selected));}
  for(const view of document.querySelectorAll(".view"))view.classList.toggle("active",view.id===tab);
}
function events(){
  document.querySelector(".nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)activate(b.dataset.view);});
  $("class-filters").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b){state.weaponClass=b.dataset.category;showClasses();}});
  $("weapon-search").addEventListener("input",e=>{state.search=e.target.value;showClasses();});
  for(const id of ["popular-list","class-list","best-list"])
    $(id).addEventListener("click",e=>{const b=e.target.closest("[data-weapon]");if(b){state.focus=b;details(b.dataset.weapon);}});
  $("modal-close").addEventListener("click",closeDetails);$("modal-backdrop").addEventListener("click",closeDetails);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("weapon-modal").hidden)closeDetails();});
}
async function init(){
  events();
  try{
    const paths=["popularity","catalog","meta","status"];
    const responses=await Promise.all(paths.map(n=>fetch("./data/"+n+".json",{cache:"no-store"})));
    if(responses.slice(0,3).some(r=>!r.ok))throw new Error("Mindestens eine Waffendatenquelle fehlt");
    [state.trend,state.catalog,state.builds,state.status]=await Promise.all(responses.map((r,i)=>r.ok?r.json():null));
    if(!Array.isArray(state.trend.popular)||!Array.isArray(state.catalog.classes))throw new Error("Datenformat unvollständig");
    $("data-note").textContent="Pick-Rates: "+state.trend.observedAt+" · Quelle INT.GG · Tägliche Quellenprüfung separat";
    showPopular();showBest();showClasses();showUpdates();
  }catch(e){$("data-note").textContent="Datenfehler: "+e.message;for(const id of ["popular-list","class-list","best-list"])$(id).innerHTML='<div class="empty">Daten derzeit nicht verfügbar.</div>';}
}
if("serviceWorker" in navigator && location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
init();
})();