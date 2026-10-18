(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const key = str => String(str||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const state = { meta:null, catalog:null, measurements:null, status:null, activeClass:"all", activeStyle:"all", buildClass:"all", buildWeapon:"all", lastFocus:null };
  const categories = () => state.catalog?.classes || [];
  const itemClass = name => categories().find(c => c.weapons.some(w => key(w) === key(name)));
  const rec = name => state.meta?.recommendations.find(w => key(w.name) === key(name)) || null;
  const measurement = name => state.measurements?.weapons.find(w => key(w.name) === key(name)) || null;
  const validImg = u => { try { const url = new URL(u); return url.protocol === "https:" ? esc(url.href) : ""; } catch { return ""; } };
  const image = (name, category, extraClass="") => {
    const raw = state.catalog.exactImages[name] || category.image;
    const exact = !!state.catalog.exactImages[name];
    return '<div class="weapon-media ' + extraClass + '">' +
       '<img loading="lazy" decoding="async" alt="' + esc(exact ? "Offizielles BF6-Motiv für "+name : "Offizielles EA-Klassenmotiv: "+category.label) + '" src="' + validImg(raw) + '">' +
       (!exact ? '<span class="image-label">KLASSENMOTIV</span>' : '<span class="image-label real">EA-MOTIV</span>') +
       '</div>';
  };
  const stars = (w) => w ? '<span class="arsenal-tier ' + esc(w.tier.toLowerCase()) + '">' + esc(w.tier) + ' TIER</span>' : '<span class="arsenal-tier unrated">OHNE TIER</span>';
  const cap = value => value === null || value === undefined ? "Nicht bestätigt" : esc(value);
  function updateFreshness() {
    const box = $("meta-freshness"), data = state.meta, status = state.status || {};
    const current = status.latestPatch?.version;
    const newer = !!(current && current !== data.patch);
    const alert = newer ? "Neuer Patch " + current + " erkannt. Tier-Wertungen und Builds basieren noch auf " + data.patch + "." :
      "Meta-/Build-Stand: Patch " + data.patch + ". Quellen vom 13. und 15. Oktober 2026. Patch-Abgleich und Messwerte separat.";
    box.className = "meta-status " + (newer ? "critical" : "pending");
    box.textContent = alert;
  }
  function renderCategories() {
    const selected = state.activeClass;
    $("category-bar").innerHTML = [
      '<button type="button" data-arsenal-class="all" class="'+(selected==="all"?"active":"")+'">Alle Klassen</button>',
      ...categories().map(c => '<button type="button" data-arsenal-class="'+esc(c.id)+'" class="'+(selected===c.id?"active":"")+'">'+esc(c.label)+'</button>')
    ].join("");
    $("category-grid").hidden = selected !== "all";
    $("category-grid").innerHTML = categories().map(c => {
      const withGuide = c.weapons.filter(name=>rec(name)).length;
      return '<button class="class-tile" type="button" data-arsenal-class="'+esc(c.id)+'">' +
        '<img loading="lazy" src="'+validImg(c.image)+'" alt="EA-Klassenmotiv '+esc(c.label)+'">' +
        '<span class="class-shade"></span><span class="class-number">'+String(c.weapons.length).padStart(2,"0")+' WAFFEN</span>' +
        '<span class="class-label">'+esc(c.label)+'</span><span class="class-sub">'+esc(c.subtitle)+' · '+withGuide+' Meta-Builds <span>→</span></span></button>';
    }).join("");
  }
  function renderStyles() {
    const styles = [{id:"all",label:"Alle Spielstile"},...state.meta.playstyles];
    $("playstyles").innerHTML = styles.map(x => '<button type="button" data-arsenal-style="'+esc(x.id)+'" class="'+(state.activeStyle===x.id?"selected":"")+'" aria-pressed="'+(state.activeStyle===x.id?"true":"false")+'">'+esc(x.label)+'</button>').join("");
  }
  function pickCard(w) {
    const cat = itemClass(w.name);
    return '<button type="button" class="arsenal-card featured-card" data-arsenal-weapon="'+esc(w.name)+'">' +
      image(w.name,cat,"featured-media") +
      '<span class="arsenal-card-body"><span class="arsenal-overline">'+stars(w)+'<span>'+esc(cat.label)+'</span></span>'+
      '<strong class="arsenal-name">'+esc(w.name)+'</strong><span class="arsenal-sub">'+esc(w.pitch)+'</span>'+
      '<span class="arsenal-tags">'+w.tags.slice(0,3).map(t=>'<span>'+esc(t)+'</span>').join("")+'</span>'+
      '<span class="arsenal-open">BUILD ANSEHEN <span>↗</span></span></span></button>';
  }
  function renderFeatured() {
    const allMode = state.activeClass === "all";
    $("featured-section").hidden = !allMode;
    if (!allMode) return;
    const arr = state.meta.recommendations.filter(w => state.activeStyle==="all" || w.styles.includes(state.activeStyle));
    const tiers = [...new Set(arr.map(w=>w.tier))].sort();
    $("meta-picks").innerHTML = arr.length ? tiers.map(tier => '<section class="tier-block"><div class="tier-heading"><span class="arsenal-tier '+esc(tier.toLowerCase())+'">'+esc(tier)+' TIER</span><span>'+arr.filter(w=>w.tier===tier).length+' EMPFEHLUNGEN</span></div>'+
      '<div class="arsenal-grid">'+arr.filter(w=>w.tier===tier).map(pickCard).join("")+'</div></section>').join("") :
      '<div class="empty">Für diesen Spielstil liegen noch keine Empfehlungen vor.</div>';
  }
  function rosterCard(name,cat) {
    const w=rec(name), stats=measurement(name);
    const foot=w ? "META-BUILD VORHANDEN" : stats ? "MESSWERTE VERFÜGBAR" : "DETAILS ANSEHEN";
    return '<button type="button" class="arsenal-card roster-card" data-arsenal-weapon="'+esc(name)+'">' +
      image(name,cat,"roster-media")+'<span class="arsenal-card-body"><span class="arsenal-overline">'+stars(w)+'</span>'+
      '<strong class="arsenal-name">'+esc(name)+'</strong>'+
      (stats ? '<span class="stat-mini">'+Math.round(stats.rpm)+' RPM · '+Math.round(stats.ttk[1])+' ms TTK bei 20 m</span>' : '<span class="stat-mini">Keine geprüften TTK-Messwerte</span>')+
      '<span class="arsenal-open">'+foot+' <span>→</span></span></span></button>';
  }
  function renderRoster() {
    const panel=$("category-selection");
    if(state.activeClass==="all"){panel.innerHTML="";return;}
    const cat=categories().find(c=>c.id===state.activeClass);if(!cat)return;
    const sorted=cat.weapons.slice().sort((a,b) => {
      const aw=rec(a),bw=rec(b);
      const points=w=>w?.tier==="S"?0:w?.tier==="A"?1:2;
      return points(aw)-points(bw) || a.localeCompare(b,"de");
    });
    panel.innerHTML='<div class="class-hero"><img src="'+validImg(cat.image)+'" alt="Offizielles EA-Klassenmotiv '+esc(cat.label)+'">' +
      '<span class="class-hero-shade"></span><div class="class-hero-body"><p class="eyebrow">WAFFENKLASSE · '+String(cat.weapons.length)+' WAFFEN</p><h2>'+esc(cat.label)+'</h2><p>'+esc(cat.description)+'</p></div></div>' +
      '<div class="roster-heading"><h3>Waffen in dieser Klasse</h3><span>Sortiert nach verfügbaren Meta-Empfehlungen</span></div>'+
      '<div class="arsenal-grid roster-grid">'+sorted.map(name=>rosterCard(name,cat)).join("")+'</div>'+
      '<p class="method">Nicht jede Waffe hat einen verifizierten Build oder eine Tier-Einstufung. „Ohne Tier“ heißt nicht, dass die Waffe schlecht ist. EA-Klassenmotive dienen als Bildersatz, wenn kein eindeutig zugeordnetes Waffenmotiv vorliegt.</p>';
  }
  function setClass(id) {
    if(id!=="all"&&!categories().some(c=>c.id===id))return;
    state.activeClass=id;
    renderCategories();renderRoster();renderFeatured();
    if(id!=="all")$("category-selection").scrollIntoView({behavior:"smooth",block:"start"});
    else $("category-bar").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function buildRows(w) {
    if(!w)return '<div class="no-data"><strong>Noch kein überprüfter Build hinterlegt.</strong><p>Wir übernehmen keine geschätzten Aufsätze. Diese Waffe bleibt in der Übersicht, bis eine zuverlässige Quelle vorliegt.</p></div>';
    return '<div class="attachments-grid">'+Object.entries(w.attachments).map(([slot,attachment]) =>
      '<div class="attachment-row"><span>'+esc(slot)+'</span><strong>'+esc(attachment)+'</strong></div>').join("")+'</div>';
  }
  function buildCard(w) {
    const cat=itemClass(w.name);
    return '<article class="build-card visual-build"><div class="build-art">'+image(w.name,cat,"build-media")+
    '<span class="build-art-title">'+stars(w)+'<strong>'+esc(w.name)+'</strong></span></div>'+
    '<div class="build-content"><p class="build-desc">'+esc(w.pitch)+'</p>'+
    buildRows(w)+'<button class="detail-build-button" type="button" data-arsenal-weapon="'+esc(w.name)+'">WAFFE & DETAILS ÖFFNEN <span>→</span></button></div></article>';
  }
  function renderBuilds() {
    let arr=state.meta.recommendations;
    if(state.buildClass!=="all")arr=arr.filter(w=>itemClass(w.name)?.id===state.buildClass);
    if(state.buildWeapon!=="all")arr=arr.filter(w=>w.id===state.buildWeapon);
    $("build-cards").innerHTML=arr.length?arr.map(buildCard).join(""):'<div class="empty">Für diese Auswahl liegt noch kein geprüfter Build vor.</div>';
    $("build-class-filter").innerHTML=['<button data-build-class="all" class="'+(state.buildClass==="all"?"active":"")+'">Alle Klassen</button>',
      ...categories().map(c=>'<button data-build-class="'+esc(c.id)+'" class="'+(state.buildClass===c.id?"active":"")+'">'+esc(c.label)+'</button>')].join("");
  }
  function setupBuilds() {
    $("build-weapon").innerHTML='<option value="all">Alle Waffen-Builds</option>'+state.meta.recommendations.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.name)+'</option>').join("");
    $("build-weapon").addEventListener("change",e=>{state.buildWeapon=e.target.value;renderBuilds();});
    $("build-class-filter").addEventListener("click",e=>{const b=e.target.closest("[data-build-class]");if(b){state.buildClass=b.dataset.buildClass;state.buildWeapon="all";$("build-weapon").value="all";renderBuilds();}});
    renderBuilds();
  }
  function statsHtml(s) {
    if(!s)return '<p class="no-measurements">Für diese Waffe liegen in unserer Messreihe noch keine bestätigten TTK-Daten vor.</p>';
    return '<div class="detail-stats"><div><small>RPM</small><strong>'+Math.round(s.rpm)+'</strong></div><div><small>GESCHWINDIGKEIT</small><strong>'+Math.round(s.velocity)+' m/s</strong></div>'+
      [0,20,35,75].map((d,i)=>'<div><small>TTK · '+d+' M</small><strong>'+Math.round(s.ttk[i])+' ms</strong></div>').join("")+'</div>'+
      '<p class="detail-muted">Community-Messreihe, nicht zwingend mit aktuellem Patch identisch. Werte ohne gewählte Aufsätze.</p>';
  }
  function openWeapon(name,trigger) {
    const cat=itemClass(name);
    if(!cat)return;
    const w=rec(name),s=measurement(name);
    state.lastFocus=trigger||document.activeElement;
    $("weapon-detail-body").innerHTML=image(name,cat,"detail-image")+
      '<div class="detail-inner"><p class="eyebrow">'+esc(cat.label)+' · BF6 ARSENAL</p>'+
      '<div class="detail-name-row"><h2>'+esc(name)+'</h2>'+stars(w)+'</div>'+
      '<p class="detail-lead">'+esc(w?.pitch||cat.description)+'</p>'+
      (w ? '<div class="detail-tags">'+w.tags.map(t=>'<span>'+esc(t)+'</span>').join("")+'</div>' : '')+
      (w?.unlock ? '<p class="unlock"><strong>Freischaltung:</strong> '+esc(w.unlock)+'</p>' : '<p class="unlock">Freischaltlevel: nicht bestätigt.</p>')+
      '<h3>Empfohlene Aufsätze</h3>'+buildRows(w)+
      (w ? '<a class="source-link" href="'+validImg(state.meta.sourceBuilds)+'" target="_blank" rel="noopener noreferrer">Build-Quelle ansehen ↗</a>' : '')+
      '<h3>Waffenwerte</h3>'+statsHtml(s)+
      '<div class="detail-foot">Quellen: EA-Klassenguide, externe Meta-/Build-Guides und Community-Messwerte. Die Datenstände können voneinander abweichen.</div></div>';
    $("weapon-detail-backdrop").hidden=false;
    $("weapon-detail").hidden=false;
    $("weapon-detail").setAttribute("aria-hidden","false");
    document.body.classList.add("detail-open");
    $("weapon-detail-close").focus();
  }
  function closeWeapon() {
    $("weapon-detail-backdrop").hidden=true;$("weapon-detail").hidden=true;
    $("weapon-detail").setAttribute("aria-hidden","true");
    document.body.classList.remove("detail-open");
    state.lastFocus?.focus?.();
  }
  function exposeRankingArt(){
    window.BF6_ART={
      categories:Object.fromEntries(categories().map(c=>[c.code,c.image])),
      exact:state.catalog.exactImages
    };
    if(typeof renderRankings==="function")renderRankings();
  }
  function events() {
    $("category-bar").addEventListener("click",e=>{const b=e.target.closest("[data-arsenal-class]");if(b)setClass(b.dataset.arsenalClass);});
    $("category-grid").addEventListener("click",e=>{const b=e.target.closest("[data-arsenal-class]");if(b)setClass(b.dataset.arsenalClass);});
    $("playstyles").addEventListener("click",e=>{const b=e.target.closest("[data-arsenal-style]");if(b){state.activeStyle=b.dataset.arsenalStyle;renderStyles();renderFeatured();}});
    for(const id of ["meta-picks","category-selection","build-cards"]){
      $(id).addEventListener("click",e=>{const b=e.target.closest("[data-arsenal-weapon]");if(b)openWeapon(b.dataset.arsenalWeapon,b);});
    }
    $("weapon-detail-close").addEventListener("click",closeWeapon);
    $("weapon-detail-backdrop").addEventListener("click",closeWeapon);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("weapon-detail").hidden)closeWeapon();});
    document.addEventListener("error",e=>{if(e.target?.tagName==="IMG"&&e.target.closest(".weapon-media, .class-tile, .class-hero"))e.target.classList.add("image-failed");},true);
  }
  async function init() {
    events();
    try {
      const [a,b,c,d] = await Promise.all(["meta","catalog","weapons","status"].map(name=>fetch("./data/"+name+".json",{cache:"no-store"})));
      if(!a.ok||!b.ok)throw new Error("Meta- oder Klassenkatalog ist nicht erreichbar.");
      state.meta=await a.json();state.catalog=await b.json();
      if(!Array.isArray(state.catalog.classes)||!Array.isArray(state.meta.recommendations))throw new Error("Unvollständige Datenstruktur.");
      if(c.ok)state.measurements=await c.json();
      if(d.ok)state.status=await d.json();
      updateFreshness();renderCategories();renderStyles();renderFeatured();renderRoster();setupBuilds();exposeRankingArt();
    }catch(e){$("meta-freshness").textContent="Daten nicht verfügbar: "+e.message;$("meta-freshness").className="meta-status critical";}
  }
  init();
})();