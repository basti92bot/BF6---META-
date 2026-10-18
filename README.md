# BF6 META – Loadout Lab

Aktuelle App-Version **0.7.0**. Unabhängiges, kostenloses Battlefield-6/REDSEC-Fanprojekt.

## Die App: Loadouts zuerst

Statt Pick-Rates und Meta-Score als Startseite gibt es ausschließlich konkrete Waffen-Builds mit:
- **drei Ebenen**: zuerst Spielmodus, dann Soldatenklasse (Alle/Sturm/Pionier/Versorgung/Aufklärung), dann passende Waffenklasse; vorhandene Builds werden direkt darunter angezeigt.
- **offiziellen Signaturwaffen**: Sturm = AR, Pionier = SMG, Versorgung = LMG, Aufklärung = Sniper. Verwendet mit EA-Klassenaffinität und Alternativen (Karabiner, DMR, Schrotflinten). Waffenwahl hängt von offenen/geschlossenen Regeln und REDSEC-Mechaniken ab. Quelle: https://www.ea.com/games/battlefield/battlefield-6/news/loadout-creation-and-weapon-classes
- **dynamischer Waffenklassenauswahl**: nur Kategorien, für die bereits ein dokumentierter Build vorliegt. Auswahl und Sortierung dienen als redaktionelle Empfehlung, nicht als wissenschaftliche oder offizielle TTK-Gesamtrangliste.
- **drei Modus-Reitern**: Mehrspieler, Rapid Royale und REDSEC Battle Royale.
- **optional einblendbaren Spielstil-Filtern**: Alle, aggressiv, Allround, wenig Rückstoß, Distanz und Sniper.
- **14 dokumentierten Aufsatzkonfigurationen**: 9 für MP, 8 auf Rapid Royale übertragene Empfehlungen, 5 BR-spezifische (die angezeigten Konfigurationen überschneiden sich).
- kompletten Gunsmith-Aufsatztabellen, direktem Quellenlink und einem **„Loadout kopieren“**-Button.
- Messwerten wie TTK in Millisekunden, soweit die Quelle sie für den Spielmodus liefert.

Die App startet aus `index.html` und verwendet `loadouts.css`, `loadouts.js` und `data/loadouts.json`.

## Was bedeuten die Werte?

**TTK** = *Time to Kill*: Wie viele Millisekunden benötigt ein theoretischer bzw. gemessener Tötungsvorgang unter bestimmten Bedingungen? Je kleiner der Wert, desto schneller. In einem echten Match zählen auch Trefferquote, ADS, Rückstoß, Magazingröße, Bewegung und Rüstung.

- **MP-Werte aus Battlefinity (Datenstand 16.10.2026)**: durchschnittliche TTK über 0–10 und 10–40 m aus der Battlefield-Multiplayer-Übersicht (derzeit M433, DRS-IAR, Mk 24).
- **Andere MP-Werte aus bdeland/bf6_guns**: Grundwaffen-TTK bei 20 m und RPM. Community-Messreihe mit 31 Waffen, kann durch spätere Patches veraltet sein.
- **REDSEC-Werte aus Battlefinity (Datenstand 06.07.2026)**: modellierte TTK über 0–10 und 10–40 m auf Basis des damals implementierten REDSEC-Schadensmodells. Älterer Datenstand, ggf. nicht nach Season-5-Balance gültig.
- **Rapid Royale**: keine Waffen-TTK eingeblendet, solange keine modusspezifisch verifizierten Werte vorliegen.
- **Ganz wichtig**: Diese TTK-Werte sind **keine Messung des angezeigten Aufsatz-Builds**. Sie dienen zur Orientierung über die **Grundwaffe bzw. das zugrundeliegende Modell**; es wird kein angeblicher TTK-Bonus durch spezifische Aufsätze erfunden.

Der aktuelle Patch 2.1.1.0 ist im Quellenstatus erfasst, aber die bestehenden Builds sind nicht unabhängig mit diesem Patch validiert.

## Quellen

- Offizielle Patchnotes: https://www.ea.com/games/battlefield/battlefield-6/news
- Community-Loadouts: https://www.bftactics.com/weapons-database
- Battlefield-6-/REDSEC-Loadouts und TTK-Modelle: https://battlefinity.gg/battlefield
- Dokumentierte Mechanik-/Aufsatz-Modellierung: https://github.com/raymdl/BF6-Weapon-Analyzer
- Community-Basismesswerte 31 Waffen: https://github.com/bdeland/bf6_guns (MIT-Lizenz mit Attribution in `THIRD_PARTY_NOTICES.md`)
- Modusspezifische Schadensmodelle: https://github.com/Riketta/BF6-Weapon-Stats

Diese Quellen werden **nicht zu einer erfundenen Meta-Gesamtwertung vermischt**.

## Datenaktualisierung

Der bestehende GitHub-Workflow `.github/workflows/daily-check.yml` überprüft täglich EA-Patchnotes, Community-Messwerte und die Quellenseiten der Guide-/Statistik-Anbieter. Das ist **keine automatische Validierung oder Aktualisierung jedes Loadouts**.

Neue Balance-Patches können TTK-Daten oder Build-Empfehlungen ungültig machen. Die App sollte dadurch nicht ungeprüft neue Bestwerte erfinden.

## PWA

GitHub Pages: Settings > Pages > Deploy from branch `main`, Ordner `/(root)`.

Service-Worker-Cache-Version: `bf6meta-v11`; statische App-Dateien werden bevorzugt aus dem Netzwerk geladen, um Versionskonflikte zu vermeiden.

Kein Nutzerkonto und keine eigenen gespeicherten Loadouts.
