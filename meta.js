(() => {
  "use strict";
  const elem = (id) => document.getElementById(id);
  const esc = (x) => String(x ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const state = { data: null, style: "all", weapon: "all", status: null };
  function safeLink(url) {
    try { const u = new URL(url); return ["https:", "http:"].includes(u.protocol) ? esc(u.href) : "#"; }
    catch { return "#"; }
  }
  function fresh() {
    const data = state.data;
    if (!data) return;
    const current = state.status?.latestPatch?.version;
    const newer = Boolean(current && current !== data.patch);
    const problem = Boolean(state.status?.reviewNeeded);
    const box = elem("meta-freshness");
    box.className = "meta-status " + (newer ? "critical" : "pending");
    box.textContent = newer ? "ACHTUNG: Neueren Patch " + current + " erkannt. Die Meta-Empfehlungen sind noch für " + data.patch + " und müssen geprüft werden." :
      "Meta-Stand: Patch " + data.patch + " · Empfehlungen: 13.10.2026 · Builds: 15.10.2026. " + (problem ? "Messwerte separat noch nicht vollständig validiert." : "Guide-Daten und Waffenmesswerte sind getrennte Quellen.");
  }
  function makePick(w) {
    return '<article class="pick-card"><div class="pick-head"><span class="pick-tier ' + esc(w.tier.toLowerCase()) + '">' + esc(w.tier) + '</span><span class="pick-category">' + esc(w.category) + '</span></div>' +
      '<h3>' + esc(w.name) + '</h3><p>' + esc(w.pitch) + '</p>' +
      '<div class="pick-tags">' + w.tags.map(t => '<span>' + esc(t) + '</span>').join("") + '</div>' +
      (w.unlock ? '<p class="unlock"><strong>Freischalten:</strong> ' + esc(w.unlock) + '</p>' : '') +
      '<button class="pick-action" type="button" data-open-build="' + esc(w.id) + '">AUFSÄTZE ANSEHEN <span aria-hidden="true">→</span></button></article>';
  }
  function renderPicks() {
    const ds = state.data;
    if (!ds) return;
    const picks = ds.recommendations.filter(w => state.style === "all" || w.styles.includes(state.style));
    elem("meta-picks").innerHTML = picks.map(makePick).join("") || '<p class="empty">Keine passenden Empfehlungen vorhanden.</p>';
    document.querySelectorAll("[data-style]").forEach(b => {
      const active = b.dataset.style === state.style;
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function renderStyles() {
    if (!state.data) return;
    const arr = [{ id: "all", label: "Alle Empfehlungen" }, ...state.data.playstyles];
    elem("playstyles").innerHTML = arr.map(s => '<button type="button" data-style="' + esc(s.id) + '" aria-pressed="false">' + esc(s.label) + '</button>').join("");
    renderPicks();
  }
  function buildCard(w) {
    const details = Object.entries(w.attachments).map(([slot, name]) =>
      '<div class="attachment-row"><span>' + esc(slot) + '</span><strong>' + esc(name) + '</strong></div>'
    ).join("");
    return '<article class="build-card" id="build-' + esc(w.id) + '"><div class="build-heading"><div><small>' + esc(w.category) + ' · ' + esc(w.tier) + ' TIER IN QUELLEN-GUIDE</small><h3>' + esc(w.name) + '</h3></div><span class="build-count">' + Object.keys(w.attachments).length + ' AUFSÄTZE</span></div>' +
      '<p class="build-desc">' + esc(w.pitch) + '</p><div class="attachment-list">' + details + '</div>' +
      '<div class="build-bottom"><span>Quelle: BF Tactics, 15.10.2026</span><a href="' + safeLink(state.data.sourceBuilds) + '" rel="noopener noreferrer" target="_blank">Original prüfen ↗</a></div></article>';
  }
  function renderBuilds() {
    if (!state.data) return;
    const filtered = state.data.recommendations.filter(w => state.weapon === "all" || w.id === state.weapon);
    elem("build-cards").innerHTML = filtered.map(buildCard).join("");
  }
  function setupBuilds() {
    const input = elem("build-weapon");
    input.innerHTML = '<option value="all">Alle Waffen-Builds</option>' + state.data.recommendations.map(w => '<option value="' + esc(w.id) + '">' + esc(w.name) + '</option>').join("");
    input.addEventListener("change", e => { state.weapon = e.target.value; renderBuilds(); });
    renderBuilds();
  }
  function handleNavigation(event) {
    const styleButton = event.target.closest("[data-style]");
    if (styleButton) {
      state.style = styleButton.dataset.style;
      renderPicks();
      return;
    }
    const buildButton = event.target.closest("[data-open-build]");
    if (buildButton) {
      state.weapon = buildButton.dataset.openBuild;
      elem("build-weapon").value = state.weapon;
      renderBuilds();
      if (typeof openTab === "function") openTab("builds");
      else {
        document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "builds"));
        document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "builds"));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function start() {
    elem("playstyles").addEventListener("click", handleNavigation);
    elem("meta-picks").addEventListener("click", handleNavigation);
    try {
      const [dataResponse, statusResponse] = await Promise.all([
        fetch("./data/meta.json", { cache: "no-store" }),
        fetch("./data/status.json", { cache: "no-store" })
      ]);
      if (!dataResponse.ok) throw new Error("Empfehlungen konnten nicht geladen werden");
      const data = await dataResponse.json();
      if (!Array.isArray(data.recommendations) || data.recommendations.length === 0) throw new Error("Keine Meta-Empfehlungen im Datenbestand");
      state.data = data;
      if (statusResponse.ok) state.status = await statusResponse.json();
      fresh();
      renderStyles();
      setupBuilds();
    } catch (e) {
      elem("meta-freshness").className = "meta-status critical";
      elem("meta-freshness").textContent = "Meta-Daten nicht verfügbar: " + e.message + ". Die Statistik-Seite bleibt nutzbar.";
    }
  }
  start();
})();
