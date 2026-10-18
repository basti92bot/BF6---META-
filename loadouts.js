"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fmt = value => Math.round(value).toLocaleString("de-DE");
  const state = { mode:"mp", style:"all", catalog:null, loadouts:null, weapons:null, status:null };
  const modes = {
    mp: { title:"Mehrspieler",description:"Normale BF6-Matches. Hier dürfen wir TTK-Messwerte von Multiplayer-Grundwaffen vergleichen." },
    rapid: { title:"Rapid Royale",description:"Schnelle REDSEC-Runden. Diese Builds sind aus passenden Community-Setups abgeleitet, aber nicht separat in Rapid Royale vermessen." },
    br: { title:"REDSEC Battle Royale",description:"REDSEC-Builds mit älteren BR-Panzerungsmodellen. TTK-Werte bitte nicht mit ungerüstetem Multiplayer vergleichen." }
  };
  const order = {
    mp:["mp-m433","mp-drs","mp-m4a1","mp-scw","mp-mk24","mp-rspr","mp-sg","mp-m87","mp-scout"],
    rapid:["mp-scw","mp-m4a1","mp-m433","mp-rspr","mp-sg","mp-drs","mp-mk24","mp-m87"],
    br:["br-scw","br-drs","br-m4a1","br-interdictor","br-sg"]
  };
  const classByWeapon = name => state.catalog?.classes.find(c=>c.weapons.some(w=>norm(w)===norm(name)));
  const base = name => state.weapons?.weapons.find(w=>norm(w.name)===norm(name));
  const visibleBuilds = () => state.loadouts.builds.filter(b=>b.modes.includes(state.mode) && (state.style==="all" || b.styles.includes(state.style)))
      .sort((a,b)=>order[state.mode].indexOf(a.id)-order[state.mode].indexOf(b.id));
  const formatDate = d => {if(!d)return "nicht angegeben";const date=new Date(d+"T12:00:00Z");return Number.isNaN(date.valueOf())?d:date.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});};
  function metrics(build) {
    if(state.mode==="rapid") return '<div class="evidence-notice">Für Rapid Royale liegen keine belastbaren Build-TTK-Werte vor.</div>';
    const data=build.metric;
    if(data && data.mode===state.mode){
      return '<div class="metrics"><div><small>TTK 0–10 M</small><strong>'+fmt(data.ttkClose)+' <span>ms</span></strong></div>'+
        '<div><small>TTK 10–40 M</small><strong>'+fmt(data.ttkMid)+' <span>ms</span></strong></div></div>'+
        '<p class="metric-foot">Modellwerte laut <a href="'+safe(data.source)+'" target="_blank" rel="noopener noreferrer">Battlefinity</a> · Datenstand '+formatDate(data.sourceDate)+'. Keine gemessene Build-Verbesserung.</p>';
    }
    const weapon=base(build.weapon);
    if(state.mode==="mp" && weapon && Array.isArray(weapon.ttk) && Number.isFinite(weapon.ttk[1])){
      return '<div class="metrics"><div><small>TTK GRUNDWAFFE · 20 M</small><strong>'+fmt(weapon.ttk[1])+' <span>ms</span></strong></div>'+
        '<div><small>FEUERRATE</small><strong>'+fmt(weapon.rpm)+' <span>RPM</span></strong></div></div>'+
        '<p class="metric-foot">Ältere Community-Messreihe <a href="https://github.com/bdeland/bf6_guns" target="_blank" rel="noopener noreferrer">bf6_guns</a> · ohne diesen Build, nicht gegen Season 5 validiert.</p>';
    }
    return '<div class="evidence-notice">Noch keine belastbaren TTK-Messwerte für diesen Modus und diesen Build.</div>';
  }
  function equipmentRows(entries){
    return entries.map(([slot,part]) => '<div class="part"><span>'+safe(slot)+'</span><strong>'+safe(part)+'</strong></div>').join("");
  }
  function card(build,index) {
    const cat=classByWeapon(build.weapon);
    const entries=Object.entries(build.attachments);
    const preferred=["Mündung","Lauf","Magazin"];
    const highlights=preferred.map(slot=>entries.find(([s])=>s===slot)).filter(Boolean);
    if(highlights.length<3)for(const e of entries)if(!highlights.includes(e)&&highlights.length<3)highlights.push(e);
    const rest=entries.filter(e=>!highlights.includes(e));
    const copied=entries.map(([slot,p])=>slot+": "+p).join("\n");
    const source=build.source||{};
    const sourceSubtitle=state.mode==="rapid"?"Aus einem MP-Guide abgeleitet · nicht Rapid-getestet":source.mode+" · nicht für aktuellen Patch verifiziert";
    const summary = rest.length
      ? '<details class="more-parts"><summary>ALLE '+entries.length+' AUFSÄTZE ANZEIGEN <span aria-hidden="true">⌄</span></summary><div class="hidden-parts">'+equipmentRows(rest)+'</div></details>'
      : "";
    return '<article class="loadout-card" id="'+safe(build.id)+'">'+
      '<div class="card-heading"><div class="card-overline"><span class="num">'+String(index+1).padStart(2,"0")+'</span><span>'+safe(cat?.label||"WAFFE")+'</span><span class="build-type">'+safe(build.title)+'</span></div>'+
      '<h3>'+safe(build.weapon)+'</h3><p>'+safe(build.subtitle)+'</p></div>'+
      '<div class="card-body"><div class="hint"><span class="hint-icon">↗</span><span>'+safe(build.why)+'</span></div>'+
      metrics(build)+
      '<div class="parts-head"><strong>GUNSMITH · AUFSÄTZE</strong><small>'+entries.length+' Teile</small></div>'+
      '<div class="parts-preview">'+equipmentRows(highlights)+'</div>'+summary+
      '<div class="loadout-actions"><button type="button" data-copy="'+safe(build.id)+'" class="copy-build">LOADOUT KOPIEREN <span>⧉</span></button>'+
      '<a href="'+safe(source.url)+'" target="_blank" rel="noopener noreferrer">BUILD-QUELLE ↗</a></div>'+
      '<p class="provenance">'+safe(sourceSubtitle)+(source.reviewedDate?' · '+formatDate(source.reviewedDate):'')+'</p></div></article>';
  }
  function render(){
    if(!state.loadouts)return;
    for(const b of document.querySelectorAll("[data-mode]")){
      const active=b.dataset.mode===state.mode;b.classList.toggle("chosen",active);b.setAttribute("aria-selected",String(active));
    }
    for(const b of document.querySelectorAll("[data-style]")){
      const active=b.dataset.style===state.style;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
    }
    $("mode-info").textContent=modes[state.mode].description;
    $("results-title").textContent=state.style==="all"?"Loadouts für "+modes[state.mode].title:"Passende Loadouts";
    const builds=visibleBuilds();
    $("results-count").textContent=builds.length+" BUILDS";
    $("build-list").innerHTML=builds.length?builds.map(card).join(""):'<div class="no-builds">Für diesen Spielstil gibt es noch keinen hinreichend belegten Build. Wähle „Alle“ oder einen anderen Stil.</div>';
  }
  function sourceSection(){
    $("source-content").innerHTML='<p>Wir unterscheiden <strong>Community-Loadouts</strong> von <strong>Waffen-Messwerten</strong>. TTK bedeutet Zeit bis zum Kill bei den jeweiligen Testannahmen. Weniger Millisekunden sind schneller, aber Trefferquote, Rückstoß, Schussentfernung und Panzerung zählen ebenfalls.</p>'+
      '<div class="sources-grid">'+state.loadouts.sources.map(s=>'<a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.name)+' <span>↗</span></a>').join("")+'</div>'+
      '<p><strong>Wichtig:</strong> Kein aktuell gespeicherter Aufsatz-Build ist unabhängig mit Patch 2.1.1.0 vermessen und bestätigt. Community-Quellen können sich widersprechen. Wo Daten fehlen, erfinden wir keinen Score. Tägliche Quellenprüfung ≠ automatische Aktualisierung der Builds.</p>';
  }
  function status(){
    const patch=state.status?.latestPatch?.version||state.loadouts.patchAtCompilation;
    $("status").textContent="PATCH "+patch+" · "+state.loadouts.builds.length+" QUELLEN-BUILDS · Stand "+formatDate(state.loadouts.createdOn);
  }
  async function copyBuild(id,button){
    const b=state.loadouts.builds.find(b=>b.id===id);
    if(!b)return;
    const text=[b.weapon+" – "+b.title+" | "+modes[state.mode].title,...Object.entries(b.attachments).map(([s,p])=>s+": "+p),"Quelle: "+b.source.url].join("\n");
    if(!navigator.clipboard?.writeText){button.textContent="KOPIEREN IM BROWSER NICHT MÖGLICH";return;}
    try{await navigator.clipboard.writeText(text);button.textContent="KOPIERT ✓";}catch{button.textContent="KOPIEREN NICHT MÖGLICH";}
  }
  function events(){
    $("mode-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-mode]");if(!b)return;
      state.mode=b.dataset.mode;state.style="all";render();
    });
    $("style-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-style]");if(!b)return;
      state.style=b.dataset.style;render();
    });
    $("build-list").addEventListener("click",e=>{
      const b=e.target.closest("[data-copy]");if(b)copyBuild(b.dataset.copy,b);
    });
  }
  async function start(){
    events();
    try{
      const names=["loadouts","weapons","catalog","status"];
      const responses=await Promise.all(names.map(name=>fetch("./data/"+name+".json",{cache:"no-store"})));
      if(!responses[0].ok || !responses[2].ok)throw new Error("Build-Dateien nicht erreichbar.");
      [state.loadouts,state.weapons,state.catalog,state.status]=await Promise.all(responses.map(r=>r.ok?r.json():null));
      if(!state.loadouts?.builds?.length||!state.catalog?.classes?.length)throw new Error("Build-Daten unvollständig.");
      status();sourceSection();render();
    }catch(e){
      $("status").textContent="Loadouts konnten nicht geladen werden. Bitte Seite erneut öffnen.";
      $("build-list").innerHTML='<div class="no-builds">Keine Build-Daten verfügbar. Prüfe deine Internetverbindung.</div>';
      console.error("BF6 Loadout initialization failed:",e);
    }
  }
  if("serviceWorker" in navigator&&location.protocol!=="file:")
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  start();
})();