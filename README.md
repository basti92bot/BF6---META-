# BF6 Meta

Unabhängige, mobile Battlefield-6-Fan-App.

## Version 0.4: einfacher statt überladen

Die Hauptansicht ist komplett neu aufgebaut. Nur drei Reiter:

- **Beliebt**: fünf echte Pick-Rates aus einer aktuellen INT.GG-Momentaufnahme, keine Seitenaufrufe
- **Waffenklassen**: acht Kategorien mit Suchfunktion und 66 gelisteten Waffen
- **Beste Waffen**: fünf Waffen nach dokumentiertem INT.GG Meta-Score

Bei der Waffe öffnen sich vorhandene Builds und eine übersichtliche Detailansicht. Nicht geprüfte Waffenwerte und fehlende Builds werden ausdrücklich als fehlend gekennzeichnet. Eindeutig identifizierbare Bilder erscheinen als Waffenmotive, sonst offizielle EA-Klassenmotive mit einer deutlichen Beschriftung.

## Herkunft der Daten

**Pick-Rate und Meta-Score**: https://int.gg/bf6/weapons

- Momentaufnahme vom 18.10.2026.
- Von INT.GG ausgewertete Matches, keine offizielle Gesamterhebung aller BF6-Spieler.
- Die fünf Werte sind **noch nicht täglich automatisiert synchronisiert**. Die Datei `data/popularity.json` enthält den gesondert gekennzeichneten Snapshot.
- Eine Wiederverwendung des gesamten Drittanbieter-Datensatzes und ein automatisierter Zugriff müssen vor einer späteren Integration rechtlich und technisch geprüft werden.

**Waffenliste und Klassenmotive**: https://www.ea.com/games/battlefield/battlefield-6/news/loadout-creation-and-weapon-classes

**Community-Builds**: https://www.bftactics.com/weapons-database, als getrennte Empfehlungen in `data/meta.json`. Die Builds sind nicht für jeden neuen Patch verifiziert.

**Historische TTK-Messwerte**: https://github.com/bdeland/bf6_guns, unter MIT-Lizenz mit Attribution in `THIRD_PARTY_NOTICES.md`. Diese sind in der neuen Startseite bewusst nicht als aktuelle Meta aufgeführt.

## Tägliche Prüfung

Der bestehende Workflow `.github/workflows/daily-check.yml` prüft täglich EA-Patchnotes, den Waffen-Messdatensatz und die Guide-Quellen und speichert den Status in `data/status.json`. Das ist **keine** automatisch aktualisierte Pick-Rate- oder Build-Datenbank. Ein erkannter neuer Patch bedeutet, dass die Meta-Daten überprüft werden müssen.

## Installation und Deployment

GitHub Pages unter Settings > Pages: Deploy from a branch, `main`, `/(root)`.

Die PWA nutzt `sw.js` mit Cache-Version `bf6meta-v5`.

## Technische Details

Statisches HTML/CSS/JavaScript, keine Nutzerkonten oder eigenen Loadouts. Der aktuelle Einstieg ist `index.html` mit `simple.css` und `simple.js`.

Ein unabhängiges Fan-Projekt, nicht von EA, DICE oder den Drittanbieter-Datenquellen betrieben.
