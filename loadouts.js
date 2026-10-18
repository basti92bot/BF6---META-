"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fmt = value => Math.round(value).toLocaleString("de-DE");
  const state = { mode:"mp", role:"all", weaponClass:"all", style:"all", showExtra:false, catalog:null, loadouts:null, weapons:null, status:null, evidence:null, variants:null, compareWeapon:null, compareSet:[], compareFocus:null };
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
  const currentScore = build => {
    if (state.mode === "br" || catOf(build) !== "smg") return null;
    const scores = state.evidence?.season5SMSGScore || {};
    const matched = Object.entries(scores).find(([name])=>norm(name)===norm(build.weapon));
    return matched ? Number(matched[1]) : null;
  };
  // Quality gate: old community tiers cannot override significantly worse Season 5 observations.
  // Not a measured score for the attachment build itself.
  const reliableBuild = build => {
    if(build.recommendationStatus==="not_recommended")return false;
    if(state.mode==="br")return true;
    const score=currentScore(build);
    return score===null || score >= (state.evidence?.minScoreToRecommend ?? 45);
  };
  const eligibleBuilds = () => state.loadouts.builds.filter(b=>b.modes.includes(state.mode) && roleAllows(b) && reliableBuild(b));
  const priority = build => state.role==="all" ? 1 : catOf(build)===roles[state.role].signature ? 0 : 1;
  const orderIndex = build => {const i=order[state.mode].indexOf(build.id);return i<0?999:i;};
  const tierWeight = b => ({S:0,A:1,B:2,C:3,D:4})[b.guideTier] ?? 5;
  const rankedBuilds = () => eligibleBuilds()
    .filter(b => (state.weaponClass==="all" || catOf(b)===state.weaponClass) &&
                 (state.style==="all" || b.styles.includes(state.style)))
    .sort((a,b) => {
      const signatureFirst=priority(a)-priority(b);
      if(signatureFirst) return signatureFirst;
      if(state.mode!=="br" && catOf(a)===catOf(b) && ["smg","lmg"].includes(catOf(a))){
        const scores=catOf(a)==="lmg" ? state.evidence?.season5LMGMetaScore : state.evidence?.season5SMSGScore;
        const lookup=weapon=>Object.entries(scores||{}).find(([name])=>norm(name)===norm(weapon))?.[1];
        const sa=lookup(a.weapon),sb=lookup(b.weapon);
        if(sa!=null&&sb!=null&&sa!==sb)return Number(sb)-Number(sa);
        if(sa!=null&&sb==null)return -1;
        if(sa==null&&sb!=null)return 1;
      }
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
    if(state.mode==="rapid")return "";
    const m=build.metric;
    if(m?.mode===state.mode){
      return '<div class="compact-metrics" title="Grundwaffen-/Modell-TTK, nicht die Wirkung der Aufsätze">'+
        '<span><b>'+fmt(m.ttkClose)+'</b> ms <small>0–10 m</small></span>'+
        '<span><b>'+fmt(m.ttkMid)+'</b> ms <small>10–40 m</small></span></div>';
    }
    const w=base(build.weapon);
    if(state.mode==="mp"&&w?.ttk?.[1]!=null){
      return '<div class="compact-metrics" title="Historischer Community-Grundwaffenwert ohne diese Aufsätze">'+
        '<span><b>'+fmt(w.ttk[1])+'</b> ms <small>TTK 20 m</small></span>'+
        '<span><b>'+fmt(w.rpm)+'</b> <small>RPM</small></span></div>';
    }
    return "";
  }
  function equipmentRows(entries){
    return entries.map(([slot,part]) => '<div class="part"><span>'+safe(slot)+'</span><strong>'+safe(part)+'</strong></div>').join("");
  }
  function card(build,index) {
    const cat=classByWeapon(build.weapon);
    const isSignature=state.role!=="all"&&catOf(build)===roles[state.role].signature;
    const entries=Object.entries(build.attachments);
    const priority=["Mündung","Lauf","Magazin"];
    const featured=priority.map(slot=>entries.find(([s])=>s===slot)).filter(Boolean);
    if(featured.length<3)for(const entry of entries)if(!featured.includes(entry)&&featured.length<3)featured.push(entry);
    const others=entries.filter(entry=>!featured.includes(entry));
    const source=build.source||{};
    const compareOptions=(state.mode==="br" ? [] : state.variants?.weapons?.[build.weapon]||[]);
    const compareCount=compareOptions.length||1;
    const more=others.length ?
      '<details class="more-parts"><summary>Alle '+entries.length+' Aufsätze <span aria-hidden="true">⌄</span></summary>'+
      '<div class="hidden-parts">'+equipmentRows(others)+'</div></details>':'';
    return '<article class="loadout-card" id="'+safe(build.id)+'">'+
      '<div class="card-heading"><div class="card-overline">'+
      '<span class="num">'+(index+1)+'</span>'+
      '<span>'+safe(cat?.label||"Waffe")+'</span>'+
      (isSignature?'<span class="compact-signature">★ SIGNATUR</span>':'')+
      '</div><h3>'+safe(build.weapon)+'</h3>'+
      '<div class="build-shortlabel">'+safe(build.title)+'</div></div>'+
      '<div class="card-body">'+metrics(build)+
      '<div class="parts-head"><strong>AUFSÄTZE</strong><small>'+entries.length+' Teile</small></div>'+
      '<div class="parts-preview">'+equipmentRows(featured)+'</div>'+more+
      '<button type="button" class="compare-open" data-compare="'+safe(build.id)+'">'+
      (compareCount>1?'BUILD-VERGLEICH ('+compareCount+')':'AUFSÄTZE ANALYSIEREN')+' →</button>'+
      '<div class="loadout-actions"><button type="button" data-copy="'+safe(build.id)+'" class="copy-build">KOPIEREN <span>⧉</span></button>'+
      '<a href="'+safe(source.url)+'" target="_blank" rel="noopener noreferrer">QUELLE ↗</a></div>'+
      (state.mode==="rapid"?'<span class="short-caveat">MP-Build · Rapid nicht geprüft</span>':
       '<span class="short-caveat">'+safe(source.reviewedDate?formatDate(source.reviewedDate):"Community-Build")+' · TTK ≠ Aufsatzmessung</span>')+
      '</div></article>';
  }
  // Community records provide verified attachment selections and source totals.
  // They do not provide measured attachment-use shares or causal recoil/TTK improvements.
  const numberFromAttachment=(value,kind)=>{
    if(!value || /\b(?:keine|none)\b/i.test(value))return null;
    const pattern=kind==="magazine" ? /(?:^|[^\d])(\d{1,3})\s*(?:RND|SCHUSS)\b/i : /(\d+(?:[.,]\d+)?)\s*x\b/i;
    const match=String(value).match(pattern);
    return match ? Number(match[1].replace(",",".")) : null;
  };
  const slot=(build,key) => build?.attachments?.[key] || null;
  const variantFallback=(build)=>({
    id:"original",label:build.title,creator:build.source?.name || "Build-Guide",
    url:build.source?.url,attachments:build.attachments,points:null,votes:null,modes:build.modes
  });
  function openCompare(id,trigger){
    const build=state.loadouts?.builds.find(b=>b.id===id);
    if(!build)return;
    const genuine=(state.variants?.weapons?.[build.weapon]||[]).filter(v=>v.modes?.includes(state.mode));
    const arr=state.mode==="br"||!genuine.length?[variantFallback(build)]:genuine;
    state.compareWeapon=build.weapon;state.compareSet=arr;state.compareFocus=trigger;
    $("compare-title").textContent=build.weapon+" · "+arr.length+" Builds";
    $("compare-note").textContent=state.mode==="rapid" ?
      "Community-Multiplayer-Builds; nicht in Rapid Royale vermessen." :
      state.mode==="br" ? "REDSEC-Build. Ein unabhängiger Aufsatzvergleich fehlt noch." :
      arr.length>1 ? "Nachprüfbare Creator-Builds; keine Messung, wie oft sie gespielt werden." :
      "Dieser Build ist belegt; weitere unabhängige Varianten fehlen noch.";
    const selectValues=arr.map((v,i)=>'<option value="'+i+'">'+safe(v.label+" · "+v.creator)+'</option>').join("");
    $("compare-a").innerHTML=selectValues;$("compare-b").innerHTML=selectValues;
    $("compare-a").value="0";$("compare-b").value=String(Math.min(1,arr.length-1));
    $("compare-b").disabled=arr.length<2;
    renderComparison();
    $("compare-backdrop").hidden=false;$("compare-modal").hidden=false;
    $("compare-modal").setAttribute("aria-hidden","false");
    document.body.classList.add("compare-active");
    $("compare-close").focus();
  }
  function compareSource(v,label){
    return v?.url ? '<a href="'+safe(v.url)+'" target="_blank" rel="noopener noreferrer">'+label+' '+safe(v.creator)+' ↗</a>' : '';
  }
  function renderComparison(){
    const variants=state.compareSet;
    if(!variants.length)return;
    const a=variants[Number($("compare-a").value)]||variants[0];
    const b=variants.length>1?(variants[Number($("compare-b").value)]||variants[1]):null;
    $("compare-options").innerHTML=variants.map((v,i)=>
      '<span class="compare-choice">'+(i+1)+'. '+safe(v.label)+'</span>').join("");
    const spec=(v,k)=>v?slot(v,k):null;
    const defaultMag=state.variants?.baseMagazine?.[state.compareWeapon]?.rounds ?? null;
    const explicitA=numberFromAttachment(spec(a,"Magazin"),"magazine");
    const explicitB=b?numberFromAttachment(spec(b,"Magazin"),"magazine"):null;
    const amag=explicitA??defaultMag;
    const bmag=b?(explicitB??defaultMag):null;
    const az=numberFromAttachment(spec(a,"Visier"),"zoom");
    const bz=b?numberFromAttachment(spec(b,"Visier"),"zoom"):null;
    const stat=(label,x,y,suffix="")=>
      '<div class="compare-metric"><small>'+label+'</small><span>'+safe(x==null?"–":String(x)+suffix)+'</span><span>'+safe(y==null?"–":String(y)+suffix)+'</span></div>';
    const magDiff=bmag!==null&&amag!==null&&amag!==bmag ?
      '<p class="compare-delta">Magazin: Build B '+(bmag>amag?"+":"")+(bmag-amag)+' Schuss gegenüber A</p>' : '';
    $("compare-stats").innerHTML=
      '<div class="compare-stat-head"><span>ABGELESENE WERTE</span><b>A</b><b>B</b></div>'+
      stat("Magazin",amag,bmag," Schuss")+stat("Visier",az,bz,"×")+
      stat("Aufsatzpunkte",a.points,b?.points,"/100")+magDiff;
    const order=["Visier","Optik-Zubehör","Mündung","Lauf","Unterlauf","Magazin","Munition","Ergonomie","Oberes Zubehör","Rechtes Zubehör","Linkes Zubehör"];
    const slots=[...new Set([...order,...Object.keys(a.attachments),...Object.keys(b?.attachments||{})])];
    $("compare-table").innerHTML='<div class="compare-row compare-table-head"><strong>AUFSATZ</strong><strong>BUILD A</strong><strong>BUILD B</strong></div>'+
      slots.filter(key=>spec(a,key)||spec(b,key)).map(key=>{
        const left=spec(a,key),right=spec(b,key);
        const different=b && String(left||"")!==String(right||"");
        return '<div class="compare-row'+(different?" changed":"")+'"><span>'+safe(key)+'</span><span>'+safe(left||"—")+'</span><span>'+safe(right||"—")+'</span></div>';
      }).join("");
    $("compare-source").innerHTML=compareSource(a,"Quelle A:")+ (b?compareSource(b,"Quelle B:"):"")+
      (!spec(a,"Magazin")|| (b&&!spec(b,"Magazin")) ?
        '<span class="compare-default-mag">Ohne Magazinaufsatz: '+safe(String(defaultMag??"–"))+' Schuss (Standard laut Waffendatenbank).</span>' : "");
  }
  function closeCompare(){
    $("compare-backdrop").hidden=true;$("compare-modal").hidden=true;
    $("compare-modal").setAttribute("aria-hidden","true");
    document.body.classList.remove("compare-active");
    if(state.compareFocus?.focus)state.compareFocus.focus();
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
    const activeRole=roles[state.role];
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
    $("results-count").textContent=builds.length+" BUILDS";
    $("results-count").title="Aus "+available+" nach Quellen-Gegenprüfung geeigneten Builds. Maximal 4 verschiedene Waffen, ohne ungeprüfte Top-Platzierungen.";
    $("build-list").innerHTML=builds.length ? builds.map((b,i)=>card(b,i)).join("") :
      '<div class="no-builds">Für diese Kombination ist noch kein ausreichend belegtes Loadout vorhanden. Wähle eine andere Waffen- oder Soldatenklasse.</div>';
    const other=rankedBuilds().slice(4);
    if(!other.length){$("extra-builds").innerHTML="";return;}
    const hasKts=other.some(b=>norm(b.weapon)===norm("KTS100 MK8"));
    const expandTitle="Weitere "+other.length+" Builds"+(hasKts?" · KTS100 MK8":"");
    $("extra-builds").innerHTML='<button type="button" class="more-builds-toggle" data-more-builds aria-expanded="'+String(state.showExtra)+'">'+
      (state.showExtra?"WENIGER ANZEIGEN ↑":expandTitle+" ↓")+'</button>'+
      (state.showExtra?'<div class="build-list more-build-list">'+other.map((b,i)=>card(b,i+4)).join("")+'</div>':
      "");

  }
  function sourceSection(){
    $("source-content").innerHTML='<p>Wir unterscheiden <strong>Community-Loadouts</strong> von <strong>Waffen-Messwerten</strong>. TTK bedeutet Zeit bis zum Kill bei den jeweiligen Testannahmen. Weniger Millisekunden sind schneller, aber Trefferquote, Rückstoß, Schussentfernung und Panzerung zählen ebenfalls.</p>'+
      '<div class="sources-grid">'+state.loadouts.sources.map(s=>'<a href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.name)+' <span>↗</span></a>').join("")+'</div>'+
      '<p><strong>Klassenauswahl nach EA:</strong> Sturm = AR, Pionier = SMG, Versorgung = LMG, Aufklärung = Sniper. '+ 
      '<a href="https://www.ea.com/games/battlefield/battlefield-6/news/loadout-creation-and-weapon-classes" target="_blank" rel="noopener noreferrer">Offizieller EA-Guide ↗</a>. '+
      'In offenen Waffenregeln sind weitere Typen verwendbar. Die angezeigte Reihenfolge ist unsere redaktionelle Einstiegsempfehlung nach Spielstil und Quellendeckung, kein mathematisch belegtes globales Ranking. Pro Auswahl werden vier verschiedenartige, belegte Waffen-Builds priorisiert; bei geringerer Quellenlage entsprechend weniger.</p>'+
      '<p><strong>Gegenprüfung:</strong> Ältere Tierlists zählen nicht mehr allein. Bei MPs vergleichen wir sie mit Season-5-Matchdaten von <a href="https://int.gg/bf6/weapons" target="_blank" rel="noopener noreferrer">INT.GG ↗</a>. SL9 ist wegen deutlich schwächerer aktueller Daten nicht mehr unter den empfohlenen Builds. Das gilt auch für LMGs: KTS100 MK8 ist als alternative Support-Waffe mit Build verfügbar, aber unter den aktuellen vier Top-Empfehlungen werden neuere Season-5-Werte bevorzugt. Die Daten sind eine Stichprobe und betreffen die Grundwaffe, nicht den Gunsmith-Build.</p>'+
      '<p>Community-Vergleichsdaten: <a href="https://bf6loadouts.com/weapons/builds" target="_blank" rel="noopener noreferrer">BF6 Loadouts ↗</a>. 15 konkret verifizierte Varianten für vier Waffen. Aufsatz-Modell: <a href="https://raymdl.github.io/BF6-Weapon-Analyzer/" target="_blank" rel="noopener noreferrer">BF6 Weapon Analyzer ↗</a>. Keine Build-Nutzungsraten oder selbst ermittelten Rückstoß-Prozentwerte.</p>'+ 
      '<p><strong>Wichtig:</strong> Kein aktuell gespeicherter Aufsatz-Build ist unabhängig mit Patch 2.1.1.0 vermessen und bestätigt. Community-Quellen können sich widersprechen. Wo Daten fehlen, erfinden wir keinen Score. Tägliche Quellenprüfung ≠ automatische Aktualisierung der Builds.</p>';
  }
  function status(){
    const patch=state.status?.latestPatch?.version||state.loadouts.patchAtCompilation;
    $("status").textContent="Patch "+patch+" · "+state.loadouts.builds.length+" Builds";
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
      state.mode=b.dataset.mode;state.weaponClass="all";state.style="all";state.showExtra=false;render();
    });
    $("role-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-role]");
      if(!b||!roles[b.dataset.role])return;
      state.role=b.dataset.role;state.weaponClass="all";state.style="all";state.showExtra=false;render();
    });
    $("weapon-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-weapon-class]");
      if(!b)return;state.weaponClass=b.dataset.weaponClass;state.showExtra=false;render();
    });
    $("style-tabs").addEventListener("click",e=>{
      const b=e.target.closest("[data-style]");if(!b)return;
      state.style=b.dataset.style;state.showExtra=false;render();
    });
    for(const id of ["build-list","extra-builds"])
      $(id).addEventListener("click",e=>{
        const button=e.target.closest("[data-more-builds]");
        if(button){state.showExtra=!state.showExtra;render();return;}
        const c=e.target.closest("[data-compare]");
        if(c){openCompare(c.dataset.compare,c);return;}
        const b=e.target.closest("[data-copy]");
        if(b)copyBuild(b.dataset.copy,b);
      });
    $("compare-close").addEventListener("click",closeCompare);
    $("compare-backdrop").addEventListener("click",closeCompare);
    $("compare-a").addEventListener("change",renderComparison);
    $("compare-b").addEventListener("change",renderComparison);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("compare-modal").hidden)closeCompare();});
  }
  async function start(){
    events();
    try{
      const names=["loadouts","weapons","catalog","status","weapon-evidence","build-variants"];
      const responses=await Promise.all(names.map(name=>fetch("./data/"+name+".json",{cache:"no-store"})));
      if(!responses[0].ok || !responses[2].ok || !responses[4].ok || !responses[5].ok)throw new Error("Build- oder Vergleichsdaten nicht erreichbar.");
      [state.loadouts,state.weapons,state.catalog,state.status,state.evidence,state.variants]=await Promise.all(responses.map(r=>r.ok?r.json():null));
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