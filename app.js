"use strict";

const $ = (id) => document.getElementById(id);
const state = { weapons: [], status: null, meta: null, category: "ALL", query: "", distance: 0, a: "", b: "" };
const classes = { AR: "STURMGEWEHR", SMG: "MASCHINENPISTOLE", LMG: "LEICHTES MG", CRB: "KARABINER" };
const meters = [0, 20, 35, 75];
const html = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n) => Number.isFinite(Number(n)) ? String(Math.round(Number(n))) : "–";
const date = (s) => { if (!s) return "Noch nicht ausgeführt"; const d = new Date(s); return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); };
const sourceCard = (title, body, url, label) => '<article class="source-card"><h3>' + html(title) + '</h3><p>' + html(body) + '</p>' + (url ? '<a href="' + html(url) + '" target="_blank" rel="noopener noreferrer">' + html(label || "Quelle öffnen") + ' ↗</a>' : "") + '</article>';
function score(w, di) {
  const ttk = Number(w.ttk && w.ttk[di]);
  if (!Number.isFinite(ttk) || ttk <= 0) return Infinity;
  if (di === 0) return ttk;
  const accuracy = Number(w.accuracy && w.accuracy[di === 1 ? "close" : "long"]);
  return ttk / (Number.isFinite(accuracy) && accuracy > 0 ? Math.max(.45, Math.min(1, accuracy)) : 1);
}
function tier(rank, total) {
  const quantile = total ? rank / total : 1;
  if (quantile < .16) return "S";
  if (quantile < .40) return "A";
  if (quantile < .70) return "B";
  if (quantile < .90) return "C";
  return "D";
}
function ranked() {
  return state.weapons.filter((w) => Number.isFinite(score(w, state.distance))).slice().sort((a, b) => score(a, state.distance) - score(b, state.distance));
}
function renderRankings() {
  const all = ranked();
  const levels = new Map(all.map((w, i) => [w.id, { rank: i + 1, tier: tier(i, all.length) }]));
  const shown = all.filter((w) => (state.category === "ALL" || w.category === state.category) && w.name.toLowerCase().includes(state.query.toLowerCase()));
  $("result-count").textContent = shown.length + " von " + state.weapons.length + " Waffen";
  $("weapons").innerHTML = shown.length ? shown.map((w) => {
    const level = levels.get(w.id), t = level.tier.toLowerCase();
    return '<article class="weapon" aria-label="' + html(w.name) + ', Tier ' + level.tier + '">' +
      '<span class="rank">#' + level.rank + '</span>' +
      '<span class="tier ' + t + '">' + level.tier + '</span>' +
      '<div><div class="weapon-name">' + html(w.name) + '</div><div class="weapon-class">' + html(classes[w.category] || w.category) + '</div></div>' +
      '<div class="weapon-metric"><small>TTK · ' + meters[state.distance] + ' M</small><b>' + num(w.ttk[state.distance]) + ' ms</b></div>' +
      '<div class="weapon-metric"><small>FEUERRATE</small><b>' + num(w.rpm) + ' RPM</b></div>' +
      '<div class="weapon-score">' + num(score(w, state.distance)) + '<small>MODELL-SCORE</small></div></article>';
  }).join("") : '<div class="empty">Keine Waffen gefunden. Filter oder Suchbegriff anpassen.</div>';
}
function option(w) { return '<option value="' + html(w.id) + '">' + html(w.name) + '</option>'; }
function renderCompareOptions() {
  const arr = state.weapons.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
  $("compare-a").innerHTML = arr.map(option).join("");
  $("compare-b").innerHTML = arr.map(option).join("");
  state.a = state.weapons.some((w) => w.id === "tr-7") ? "tr-7" : (arr[0] || {}).id || "";
  state.b = state.weapons.some((w) => w.id === "m433") ? "m433" : (arr[1] || arr[0] || {}).id || "";
  $("compare-a").value = state.a;
  $("compare-b").value = state.b;
  renderCompare();
}
function renderCompare() {
  const a = state.weapons.find((w) => w.id === state.a);
  const b = state.weapons.find((w) => w.id === state.b);
  if (!a || !b) { $("compare-result").innerHTML = '<div class="empty">Keine vergleichbaren Waffen verfügbar.</div>'; return; }
  const row = (label, x, y, suffix, lowerBetter) => {
    const ax = Number(x), by = Number(y);
    const aWins = Number.isFinite(ax) && Number.isFinite(by) && (lowerBetter ? ax < by : ax > by);
    const bWins = Number.isFinite(ax) && Number.isFinite(by) && (lowerBetter ? by < ax : by > ax);
    return '<tr><td>' + html(label) + '</td><td class="' + (aWins ? "best" : "") + '">' + num(x) + (suffix || "") + '</td><td class="' + (bWins ? "best" : "") + '">' + num(y) + (suffix || "") + '</td></tr>';
  };
  const rows = [row("Feuerrate", a.rpm, b.rpm, " RPM", false), row("Projektiltempo", a.velocity, b.velocity, " m/s", false)];
  for (let i = 0; i < 4; i++) {
    rows.push(row("TTK " + meters[i] + " m", a.ttk[i], b.ttk[i], " ms", true));
    rows.push(row("Treffer bis Kill " + meters[i] + " m", a.btk[i], b.btk[i], "", true));
  }
  $("compare-result").innerHTML = '<table class="compare-table"><thead><tr><th>MESSWERT</th><th>' + html(a.name) + '</th><th>' + html(b.name) + '</th></tr></thead><tbody>' + rows.join("") + '</tbody></table><div class="method">Grün markiert den günstigeren Messwert. Keine Aussage über die tatsächliche Winrate, Recoilkontrolle oder bestimmte Aufsatzkombinationen. Bei identischen Waffen gibt es keinen Gewinner.</div>';
}
function renderStatus() {
  const st = state.status || {};
  const last = st.latestPatch || {};
  $("stat-count").textContent = state.weapons.length || "–";
  $("stat-patch").textContent = last.version || "Unbekannt";
  $("stat-check").textContent = st.lastSuccessAt ? "AKTIV" : "AUSSTEHEND";
  const warning = st.reviewNeeded;
  const errors = st.errors || [];
  const label = !st.checkedAt ? "Die erste automatische Quellenprüfung steht noch aus." : (errors.length ? "Nicht alle Quellen konnten bei der letzten Prüfung erreicht werden." : "Quellenprüfung zuletzt: " + date(st.checkedAt) + ".");
  $("notice").className = "notice" + (errors.length ? " error" : (warning ? "" : " ok"));
  $("notice").textContent = label + (warning ? " Datenprüfung erforderlich: " + (st.reviewReason || "Community-Daten nicht für aktuellen Patch bestätigt.") : "");
}
function renderUpdates() {
  const st = state.status || {}, patch = st.latestPatch || {};
  const changes = Array.isArray(st.changes) ? st.changes : [];
  $("updates-content").innerHTML = sourceCard(
    "EA Game Update " + (patch.version || "unbekannt"),
    "Offiziell veröffentlicht: " + (patch.announcedAt || "Datum nicht bestätigt") + ". Aktualisierungen der Waffenwerte werden erst nach Prüfung übernommen.",
    patch.url || "https://www.ea.com/games/battlefield/battlefield-6/news?type=game-updates",
    "Offizielle Patchnotes"
  ) + '<article class="source-card"><h3>Automatische Erkennung</h3><p>' + (st.reviewNeeded ? "Patch- und Community-Werte sind noch nicht abschließend abgeglichen. Die Rangliste nutzt den verfügbaren Community-Datensatz." : "Der Datenstatus wurde zuletzt geprüft.") + '</p><p class="metadata">Letzte erfolgreiche Quellenprüfung: ' + html(date(st.lastSuccessAt)) + '</p></article>' +
  (changes.length ? '<article class="source-card"><h3>Zuletzt erkannte Änderungen</h3>' + changes.slice(0, 8).map((x) => '<p>• ' + html(x) + '</p>').join("") + '</article>' : '<article class="source-card"><h3>Änderungshistorie</h3><p>Noch keine Änderungen seit Einrichtung dokumentiert.</p></article>');
}
function renderSources() {
  const st = state.status || {};
  const sourceList = Array.isArray(st.sources) ? st.sources : [];
  const sourceStates = sourceList.map((s) => '<p class="metadata">' + html(s.name) + ": " + (s.ok === true ? "Letzter Abruf erfolgreich" : s.ok === false ? "Letzter Abruf fehlgeschlagen" : "Noch nicht geprüft") + '</p>').join("");
  const errors = (st.errors || []).map((e) => '<p>' + html(e) + '</p>').join("");
  $("sources-content").innerHTML =
  sourceCard("Waffenmesswerte: bf6_guns", "Community-Messdaten von u/Mastahamma, bereitgestellt durch bdeland unter MIT-Lizenz. Aktuell 31 Waffen, TTK bei vier Distanzen, BTK, RPM und Geschwindigkeiten. Die Daten sind nicht als aktueller Patch verifiziert.", "https://github.com/bdeland/bf6_guns", "GitHub-Datenquelle") +
  sourceCard("Offizielle Balance-Updates: Electronic Arts", "Einmal täglich werden offizielle EA-Spielupdates auf eine neue Versionsnummer geprüft. Änderungen der Waffenmechanik werden dadurch nicht automatisch als neue Zahlen erfunden.", "https://www.ea.com/games/battlefield/battlefield-6/news?type=game-updates", "EA-Patchnotes") +
  '<article class="source-card"><h3>Prüfstatus</h3><p class="metadata">Letzte Prüfung: ' + html(date(st.checkedAt)) + '</p><p class="metadata">Letzte erfolgreiche Prüfung: ' + html(date(st.lastSuccessAt)) + '</p><p class="metadata">Messdaten zuletzt geändert: ' + html(st.weaponDataChangedAt || "unbekannt") + '</p>' + sourceStates + (errors ? '<p>Fehler beim letzten Lauf:</p>' + errors : "") + '</article>' +
  '<article class="source-card"><h3>Was bedeuten die Tiers?</h3><p>S, A, B, C und D bezeichnen die Rangposition innerhalb des verfügbaren Datensatzes. Der zugrundeliegende Modell-Score ist TTK geteilt durch den gemessenen Genauigkeitskoeffizienten (bei 0 m nur TTK). Eine höhere Klasse ist nicht automatisch eine bessere Waffe in jedem Match.</p><span class="chip warn">NICHT OFFIZIELLE META</span></article>';
}
function openTab(name) {
  document.querySelectorAll(".tab").forEach((el) => { const selected = el.dataset.tab === name; el.classList.toggle("active", selected); el.setAttribute("aria-selected", selected ? "true" : "false"); });
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === name));
}
function events() {
  document.querySelectorAll(".tab").forEach((el) => el.addEventListener("click", () => openTab(el.dataset.tab)));
  $("search").addEventListener("input", (e) => { state.query = e.target.value; renderRankings(); });
  $("category").addEventListener("change", (e) => { state.category = e.target.value; renderRankings(); });
  document.querySelectorAll("[data-distance]").forEach((el) => el.addEventListener("click", () => {
    state.distance = Number(el.dataset.distance);
    document.querySelectorAll("[data-distance]").forEach((b) => b.classList.toggle("chosen", b === el));
    renderRankings();
  }));
  $("compare-a").addEventListener("change", (e) => { state.a = e.target.value; renderCompare(); });
  $("compare-b").addEventListener("change", (e) => { state.b = e.target.value; renderCompare(); });
}
async function load() {
  events();
  try {
    const [weaponsResponse, statusResponse] = await Promise.all([
      fetch("./data/weapons.json", { cache: "no-store" }),
      fetch("./data/status.json", { cache: "no-store" })
    ]);
    if (!weaponsResponse.ok) throw new Error("Waffendaten konnten nicht geladen werden");
    const data = await weaponsResponse.json();
    if (!Array.isArray(data.weapons) || data.weapons.length < 1) throw new Error("Waffendatensatz ist leer");
    state.meta = data;
    state.weapons = data.weapons.filter((w) => w.name && w.id && w.ttk && w.ttk.length === 4);
    state.status = statusResponse.ok ? await statusResponse.json() : { reviewNeeded: true, reviewReason: "Quellenstatus konnte nicht geladen werden", errors: ["Statusdatei nicht erreichbar"] };
    renderStatus();
    renderRankings();
    renderCompareOptions();
    renderUpdates();
    renderSources();
  } catch (err) {
    $("notice").className = "notice error";
    $("notice").textContent = "Datenfehler: " + err.message + ". Bitte die Seite später neu laden.";
    $("weapons").innerHTML = '<div class="empty">Keine verlässlichen Waffendaten verfügbar.</div>';
  }
}
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
load();
