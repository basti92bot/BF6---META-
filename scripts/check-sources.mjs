import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = "data/weapons.json";
const STATUS_PATH = "data/status.json";
const META_PATH = "data/meta.json";
const MODES_PATH = "data/modes.json";
const WEAPONS_URL = "https://raw.githubusercontent.com/bdeland/bf6_guns/main/data.csv";
const PATCH_URL = "https://www.ea.com/games/battlefield/battlefield-6/news?type=game-updates";
const now = new Date().toISOString();
const today = now.slice(0, 10);
const errors = [];
const changes = [];
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const writeJson = async (p, value) => writeFile(p, JSON.stringify(value, null, 2) + "\n");
function parseCsv(source) {
  const result = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(cell); result.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Unvollständige CSV-Anführungszeichen");
  if (cell || row.length) { row.push(cell); result.push(row); }
  return result;
}
async function download(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "BF6-Meta-SourceCheck/1.0 (GitHub Actions; fan project)", "Accept": "text/html,text/csv,text/plain,*/*" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (text.length < 100) throw new Error("Quelle liefert zu wenig Inhalt");
    return text;
  } finally { clearTimeout(timeout); }
}
function communityData(csv, previous) {
  const rows = parseCsv(csv);
  const expected = ["Weapon", "Weapon Class", "BTK at 0", "BTK at 20", "BTK at 35", "BTK at 75", "RPM"];
  if (rows.length < 16 || !expected.every((column, i) => String(rows[0][i] || "").trim() === column)) {
    throw new Error("CSV-Spalten oder Anzahl unerwartet");
  }
  const classes = new Set(["AR", "SMG", "LMG", "CRB"]);
  const weapons = rows.slice(1).filter((row) => row[0] && classes.has(row[1])).map((r) => ({
    id: r[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: r[0], category: r[1], rpm: Number(r[6]), velocity: Number(r[8]),
    btk: [2, 3, 4, 5].map((i) => Number(r[i])),
    ttk: [9, 10, 11, 12].map((i) => Number(r[i])),
    accuracy: { close: Number(r[15]), long: Number(r[16]) }
  }));
  if (weapons.length < 25 || weapons.length > 150 || new Set(weapons.map((w) => w.id)).size !== weapons.length) {
    throw new Error("Unplausible Waffenanzahl oder doppelte Waffen");
  }
  const invalid = weapons.find((w) =>
    !w.name || !/^[\x20-\x7e]+$/.test(w.name) ||
    w.rpm < 200 || w.rpm > 1800 || w.velocity < 100 || w.velocity > 2000 ||
    w.ttk.some((n) => !Number.isFinite(n) || n < 50 || n > 2000) ||
    w.btk.some((n) => !Number.isInteger(n) || n < 2 || n > 20) ||
    !Number.isFinite(w.accuracy.close) || !Number.isFinite(w.accuracy.long) ||
    w.accuracy.close < .1 || w.accuracy.close > 1 || w.accuracy.long < .1 || w.accuracy.long > 1
  );
  if (invalid) throw new Error("Unplausible Werte bei Waffe: " + invalid.name);
  return { ...previous, weapons };
}
function newestPatchVersion(html) {
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const clean = withoutScripts.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ");
  const matches = [...clean.matchAll(/(?:BATTLEFIELD\s*6\s*(?:GAME\s*)?UPDATE|BATTLEFIELD\s*6\s*[-–]?\s*SPIELUPDATE|SPIELUPDATE)\s*(\d+(?:\.\d+){3})/gi)].map((m) => m[1]);
  for (const match of html.matchAll(/battlefield-6-game-update-(\d+)-(\d+)-(\d+)-(\d+)/gi)) {
    matches.push([match[1], match[2], match[3], match[4]].join("."));
  }
  if (!matches.length) throw new Error("Keine Patch-Versionsnummer in EA-News gefunden");
  matches.sort((a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 4; i++) { if (x[i] !== y[i]) return y[i] - x[i]; } return 0; });
  return matches[0];
}
const data = await readJson(DATA_PATH);
const status = await readJson(STATUS_PATH);
const meta = await readJson(META_PATH);
const modes = await readJson(MODES_PATH);
status.checkedAt = now;
let communityOk = false, officialOk = false;
try {
  const csv = await download(WEAPONS_URL);
  const next = communityData(csv, data);
  if (JSON.stringify(next.weapons) !== JSON.stringify(data.weapons)) {
    const prevCount = data.weapons.length;
    next.snapshotDate = today;
    await writeJson(DATA_PATH, next);
    status.weaponDataChangedAt = today;
    changes.push("Community-Waffendaten geändert: " + prevCount + " → " + next.weapons.length + " Waffen (" + today + ").");
    status.reviewNeeded = true;
    status.reviewReason = "Waffendaten aus Community geändert; Patch-Abgleich erforderlich.";
  }
  communityOk = true;
} catch (error) { errors.push("Community-Daten: " + error.message); }
try {
  const news = await download(PATCH_URL);
  const patch = newestPatchVersion(news);
  const previous = status.latestPatch && status.latestPatch.version;
  if (patch !== previous) {
    changes.push("Neues EA-Spielupdate entdeckt: " + (previous || "unbekannt") + " → " + patch + " (" + today + ").");
    status.latestPatch = { version: patch, announcedAt: null, url: PATCH_URL };
    status.reviewNeeded = true;
    status.reviewReason = "Neuer offizieller Patch entdeckt; Waffenwerte noch nicht validiert.";
  }
  officialOk = true;
} catch (error) { errors.push("EA Patchnotes: " + error.message); }
if (status.latestPatch?.version && status.latestPatch.version !== meta.patch) {
  status.reviewNeeded = true;
  status.reviewReason = "Meta-Empfehlungen basieren auf Patch " + meta.patch + "; aktueller Patch " + status.latestPatch.version + ". Bitte fachlich aktualisieren.";
}
const guideSources = [
  { name: "Meta-Guide Season 5", url: meta.sourceRanking },
  { name: "Build-Guide BF Tactics", url: meta.sourceBuilds }
];
for (const source of guideSources) {
  try {
    const html = await download(source.url);
    if (!/battlefield\s*6|bf6/i.test(html)) throw new Error("Seiteninhalt nicht eindeutig");
    source.ok = true;
  } catch (error) {
    source.ok = false;
    errors.push(source.name + ": " + error.message);
  }
}

const coreModeSources = [
  { name: "INT.GG Multiplayer Waffen", url: modes.modes.mp.source },
  { name: "INT.GG REDSEC Elite Waffen", url: modes.modes.br.source },
  { name: "EA Rapid Royale Guide", url: modes.modes.rapid.source }
];
for (const source of coreModeSources) {
  try {
    const page = await download(source.url);
    if (!/battlefield|redsec|rapid royale|pickrate|meta score|bf6/i.test(page)) throw new Error("Seiteninhalt nicht eindeutig");
    source.ok = true;
  } catch (error) {
    source.ok = false;
    errors.push(source.name + ": " + error.message);
  }
}
status.modeSourceCheckOnly = "INT.GG Verfügbarkeit täglich geprüft. Pick-Rates bleiben manuell übernommene Momentaufnahmen; keine automatische Zahlensynchronisierung.";
status.sources = [
  { name: "EA Patchnotes", url: PATCH_URL, ok: officialOk },
  { name: "BF6 Community Waffenwerte", url: "https://github.com/bdeland/bf6_guns", ok: communityOk },
  ...guideSources,
  ...coreModeSources
];
status.errors = errors;
if (officialOk && communityOk) status.lastSuccessAt = now;
status.changes = [...changes, ...(Array.isArray(status.changes) ? status.changes : [])].slice(0, 16);
await writeJson(STATUS_PATH, status);
console.log(JSON.stringify({ checkedAt: now, officialOk, communityOk, latestPatch: status.latestPatch, changes, errors }, null, 2));
if (!communityOk || !officialOk) process.exitCode = 1;
