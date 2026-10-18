"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fmt = value => Math.round(value).toLocaleString("de-DE");
  const state = { mode:"mp", role:"all", weaponClass:"all", style:"all", catalog:null, loadouts:null, weapons:null, status:null };
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
  // Official BF6 class signature weapon types, with cross-class choices for closed-weapon modes.
  const roles = {
    all: {title:"Alle Klassen",signature:null, description:"Wähle eine Soldatenklasse. Die dazu passenden Signaturwaffen erscheinen zuerst. Andere Waffen können je nach Modus ebenfalls nutzbar sein."},
    assault: {title:"Sturm",signature:"ar", description:"Vorne angreifen und Ziele einnehmen. Signatur: Sturmgewehre mit Handling-Vorteilen."},
    engineer: {title:"Pionier",signature:"smg", description:"Fahrzeuge bekämpfen und reparieren. Signatur: MPs mit Hüftfeuer-Vorteilen."},
    support: {title:"Versorgung",signature:"lmg", description:"Team versorgen, wiederbeleben und Feuerunterstützung geben. Signatur: leichte MGs."},
    recon: {title:"Aufklärung",signature:"sniper", description:"Aufklären und präzise Distanzschüsse. Signatur: Scharfschützengewehre."}
  };
  const sharedTypes = ["crb", "dmr", "shotgun"];
  const classByWeapon = name => state.catalog?.classes.find(c=>c.weapons.some(w=>norm(w)===norm(name)));
  const catOf = build => classByWeapon(build.weapon)?.id || null;
  const base = name => state.weapons?.weapons.find(w=>norm(w.name)===norm(name));
  const roleAllows = build => {
    if(state.role==="all")return true;
    const type=catOf(build), role=roles[state.role];
    return type===role.signature || sharedTypes.includes(type);
  };
  const eligibleBuilds = () => state.loadouts.builds.filter(b=>b.modes.includes(state.mode) && roleAllows(b));
  const priority = build => state.role==="all" ? 1 : catOf(build)===roles[state.role].signature ? 0 : 1;
  const orderIndex = build => {const i=order[state.mode].indexOf(build.id);return i<0?999:i;};
  const tierWeight = b => ({S:0,A:1,B:2,C:3,D:4})[b.guideTier] ?? 5;
  const rankedBuilds = () => eligibleBuilds()
    .filter(b => (state.weaponClass==="all" || catOf(b)===state.weaponClass) &&
                 (state.style==="all" || b.styles.includes(state.style)))
    .sort((a,b) => {
      const signatureFirst=priority(a)-priority(b);
      if(signatureFirst) return signatureFirst;
      // The default all-classes overview keeps diverse editorial starting options.
      // A chosen role or weapon category prioritizes documented source tiers.
      const curatedOverview=state.role==="all" && state.weaponClass==="all";
      return curatedOverview
        ? orderIndex(a)-orderIndex(b) || tierWeight(a)-tierWeight(b) || a.weapon.localeCompare(b.weapon,"de")
        : tierWeight(a)-tierWeight(b) || orderIndex(a)-orderIndex(b) || a.weapon.localeCompare(b.weapon,"de");
    });
  const visibleBuilds = () => rankedBuilds().slice(0,4);
  const availableTypes = () => {
    const types=[...new Set(eligibleBuilds().map(catOf).filter(Boolean))];
    const signature=roles[state.role].signature;
    return types.sort((a,b)=>(a===signature?-1:0)-(b===signature?-1:0) ||
      (state.catalog.classes.findIndex(c=>c.id===a)-state.catalog.classes.findIndex(c=>c.id===b)));
  };
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
    const isSignature=state.role!=="all" && catOf(build)===roles[state.role].signature;
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
      (isSignature?'<div class="signature-hint">★ SIGNATURWAFFE DIESER KLASSE</div>':'')+
      (index===0?'<div class="recommend-hint">EMPFEHLUNG #1</div>':'')+
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
    for(const b of document.querySelectorAll("[data-role]")){
      const active=b.dataset.role===state.role;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
    }
    for(const b of document.querySelectorAll("[data-style]")){
      const active=b.dataset.style===state.style;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
    }
    $("mode-info").textContent=modes[state.mode].description;
    const activeRole=roles[state.role];
    const hasSignature=eligibleBuilds().some(b=>catOf(b)===activeRole.signature);
    $("role-info").textContent=state.role==="all" ? activeRole.description :
      activeRole.description+" "+
      (hasSignature ? "Die Signaturwaffe wird zuerst empfohlen." : "Dafür gibt es in diesem Modus noch keinen belegten Signaturwaffen-Build.")+
      " "+(state.mode==="mp" ? "Bei offenen Waffenregeln sind auch andere Waffentypen nutzbar." :
        "REDSEC hat eigene Klassen-Loadouts und Waffen aus Kisten bzw. Custom-Drops.");
    const types=availableTypes();
    if(state.weaponClass!=="all"&&!types.includes(state.weaponClass))state.weaponClass="all";
    const topName=state.role==="all" ? "Alle Waffen" : "Alle passenden Waffen";
    const options=[{id:"all",label:topName},...types.map(id=>({id,label:state.catalog.classes.find(c=>c.id===id)?.label||id}))];
    $("weapon-tabs").innerHTML=options.map(type=>{
      const active=state.weaponClass===type.id;
      const sig=type.id===activeRole.signature;
      return '<button type="button" data-weapon-class="'+safe(type.id)+'" class="'+(active?"active":"")+(sig?" signature":"")+'" aria-pressed="'+String(active)+'">'+safe(type.label)+(sig?' <span>★</span>':'')+'</button>';
    }).join("");
    const rolePrefix=state.role==="all" ? "" : activeRole.title+" · ";
    const categoryLabel=state.weaponClass==="all" ? "" : state.catalog.classes.find(c=>c.id===state.weaponClass)?.label;
    $("results-title").textContent=rolePrefix+(categoryLabel||"Empfohlene Loadouts");
    const builds=visibleBuilds();
    const available=rankedBuilds().length;
    $("results-count").textContent=builds.length+" VORSCHLÄGE";
    $("results-count").title="Aus "+available+" dokumentierten Builds. Es werden maximal 4 unterschiedliche Waffen gezeigt.";
    $("build-list").innerHTML=builds.length ? builds.map((b,i)=>card(b,i)).join("") :
      '<div class="no-builds">Für diese Kombination ist noch kein ausreichend belegtes Loadout vorhanden. Wähle eine andere Waffen- oder Soldatenklasse.</div>';
  }
  function sourceSection(){
    $("source-content").innerHTML='<p>Wir unterscheiden <strong>Community-Loadouts</strong> von <strong>Waffen-Messwerten</strong>. TTK bedeutet Zeit bis zum Kill bei den jeweiligen Testannahmen. Weniger Millisekunden sind schneller, aber Trefferquote, Rückstoß, Schussentfernung und Panzerung zählen ebenfalls.</p>'+
      '<div class="sources-grid">'+state.loadouts.sources.map(s=>'<a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.name)+' <span>↗</span></a>').join("")+'</div>'+
      '<p><strong>Klassenauswahl nach EA:</strong> Sturm = AR, Pionier = SMG, Versorgung = LMG, Aufklärung = Sniper. '+ 
      '<a href="https://www.ea.com/games/battlefield/battlefield-6/news/loadout-creation-and-weapon-classes" target="_blank" rel="noopener noreferrer">Offizieller EA-Guide ↗</a>. '+
      'In offenen Waffenregeln sind weitere Typen verwendbar. Die angezeigte Reihenfolge ist unsere redaktionelle Einstiegsempfehlung nach Spielstil und Quellendeckung, kein mathematisch belegtes globales Ranking. Pro Auswahl werden vier verschiedenartige, belegte Waffen-Builds priorisiert; bei geringerer Quellenlage entsprechend weniger.</p>'+
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
      state.mode=b.dataset.mode;state.weaponClass="all";state.style="all";render();
    });
    $("role-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-role]");
      if(!b||!roles[b.dataset.role])return;
      state.role=b.dataset.role;state.weaponClass="all";state.style="all";render();
    });
    $("weapon-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-weapon-class]");
      if(!b)return;state.weaponClass=b.dataset.weaponClass;render();
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