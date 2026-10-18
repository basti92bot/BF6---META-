# BF6 Meta

Unabhängige, mobile Battlefield-6-Fan-App.

## Version 0.5.1: drei Spielmodi, getrennte Daten

Oben drei Spielmodus-Reiter: **Mehrspieler**, **Rapid Royale** und **Battle Royale (REDSEC Elite als Datenbasis)**. Darunter unverändert drei Bereiche:

- **Beliebt**: nur moduseigene, tatsächlich beobachtete Nutzungsanteile; Rapid Royale zeigt eine ehrliche Nichtverfügbarkeit statt falscher Prozentzahlen
- **Waffenklassen**: acht Kategorien mit Suchfunktion und 66 gelisteten Waffen
- **Beste Waffen**: in MP INT.GG Meta-Score, in REDSEC Elite Kills/Minute, in Rapid Royale redaktionelle Empfehlungen ohne vorgetäuschte Messwerte

Bei der Waffe öffnen sich vorhandene Builds und eine übersichtliche Detailansicht. Nicht geprüfte Waffenwerte und fehlende Builds werden ausdrücklich als fehlend gekennzeichnet. Eindeutig identifizierbare Bilder erscheinen als Waffenmotive, sonst offizielle EA-Klassenmotive mit einer deutlichen Beschriftung.

## Herkunft der Daten

**Mehrspieler-Pick-Rate und Meta-Score**: https://int.gg/bf6/weapons

- Momentaufnahme vom 18.10.2026.
- Von INT.GG ausgewertete Matches, keine offizielle Gesamterhebung aller BF6-Spieler.
- Die fünf Werte sind **noch nicht täglich automatisiert synchronisiert**. Die Datei `data/popularity.json` enthält den gesondert gekennzeichneten Snapshot.
- Eine Wiederverwendung des gesamten Drittanbieter-Datensatzes und ein automatisierter Zugriff müssen vor einer späteren Integration rechtlich und technisch geprüft werden.

**Waffenliste und Klassenmotive**: https://www.ea.com/games/battlefield/battlefield-6/news/loadout-creation-and-weapon-classes

**Community-Builds**: https://www.bftactics.com/weapons-database, als getrennte Empfehlungen in `data/meta.json`. Die Builds sind nicht für jeden neuen Patch verifiziert.

**Historische TTK-Messwerte**: https://github.com/bdeland/bf6_guns, unter MIT-Lizenz mit Attribution in `THIRD_PARTY_NOTICES.md`. Diese sind in der neuen Startseite bewusst nicht als aktuelle Meta aufgeführt.


### REDSEC und Rapid Royale

- REDSEC-Elite-Waffenstatistiken: https://int.gg/bf6/redsec/weapons. Gespeicherter Snapshot vom 18.10.2026; umfasst nur die in `data/modes.json` übernommenen 16 Waffen. Die angezeigte Pick-Rate gilt für **REDSEC Elite**, nicht für alle normalen Battle-Royale-Spiele.
- Rapid Royale (offizielle Modusregeln): https://www.ea.com/de/games/battlefield/redsec/news/battlefield-rapid-royale-mode-guide. Bisher keine bestätigte **Rapid-spezifische** Waffen-Pick-Rate. Eine qualitativ begründete Waffen-Auswahl ist deshalb deutlich als Einschätzung gekennzeichnet. Kein falscher Modus-Transfer.
- Spielermetriken und Crosscheck: https://tracker.gg/bf6.
- Theoretische TTK, MP/BR mit unterschiedlichen Gesundheit-/Panzerungsprofilen: https://github.com/Riketta/BF6-Weapon-Stats, Modellannahmen beachten.
- Build-Vergleich für REDSEC: https://wzstats.gg/battlefield-6/loadouts; angezeigte Season-Angaben können veraltet sein.
- Community-Aufsatztipps: https://www.bftactics.com/weapons-database, nicht automatisch für jeden Modus und Patch verifiziert.

### Quellenlogik

- Offizielle EA-Aussagen bestimmen Modusregeln und Patch-Merkmale.
- INT.GG liefert gemessene Nutzungs-/Leistungszahlen aus eigenen Samples.
- Tracker.gg hilft bei Spieler-/Modusstatistiken, belegt aber keine globalen Rapid-Waffenquoten.
- Technische Waffenmodelle erklären Unterschiede, ersetzen keine echten Matchdaten.
- Community-Builds sind Hilfen; fehlende Aussagen werden nicht erfunden.
- Acht Quellengruppen sind im aufklappbaren Bereich **„Quellen & Datenqualität“** in der App verlinkt.

## Tägliche Prüfung

Der bestehende Workflow `.github/workflows/daily-check.yml` prüft täglich EA-Patchnotes, den Waffen-Messdatensatz, die Guide-Quellen und ob die INT.GG-/Rapid-Quellseiten erreichbar sind und speichert den Status in `data/status.json`. Das ist **keine** automatisch aktualisierte Pick-Rate- oder Build-Datenbank. Ein erkannter neuer Patch bedeutet, dass die Meta-Daten überprüft werden müssen.

## Installation und Deployment

GitHub Pages unter Settings > Pages: Deploy from a branch, `main`, `/(root)`.

Die PWA nutzt `sw.js` mit Cache-Version `bf6meta-v9`.

## Technische Details

Statisches HTML/CSS/JavaScript, keine Nutzerkonten oder eigenen Loadouts. Der aktuelle Einstieg ist `index.html` mit `simple.css` und `simple.js`.

Ein unabhängiges Fan-Projekt, nicht von EA, DICE oder den Drittanbieter-Datenquellen betrieben.

## Cache-Fix 0.5.1

Versionsparameter `?v=0.5.1` für `simple.js`/`simple.css` verhindert altes JavaScript bei neuem HTML. Service Worker `bf6meta-v9` lädt App-Shell und Daten zuerst übers Netz und nutzt Cache nur als Offline-Fallback. Das korrigiert den zuvor auf iOS sichtbaren Fehler des bereits entfernten Updates-Reiters. Modus-Tabs auf Smartphones sind nun dreispaltig und kompakt.

## Korrektur 0.5.2: HTI / Interdictor

- Die INT.GG-Bezeichnung HTI und der offizielle BF6-Waffenname Interdictor meinen dasselbe Scharfschützengewehr. Die App ordnet beide intern einer Waffe zu und zeigt keine doppelte Klassenwaffe mehr.
- Für Interdictor liegt ein Community-Long-Range-Build von Rogue (14.10.2026) mit konkreten Aufsätzen vor: https://battlefinity.gg/profile/Roguey (nicht unabhängig im aktuellen Spiel geprüft).
- Wenn kein eindeutig passendes Einzelwaffenbild vorhanden ist, zeigen Waffenkarten nur noch ein neutrales Kürzel. Falsche Kategorienfotos werden nicht mehr als große Waffenbilder ausgegeben.
- Die Detailansicht stellt echte Moduswerte und verfügbare Aufsätze vor Quellen- und Datenhinweise.
