# BF6 META – Loadout Lab

Aktuelle App-Version **0.8.2**. Unabhängiges, kostenloses Battlefield-6/REDSEC-Fanprojekt.

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

Service-Worker-Cache-Version: `bf6meta-v14`; statische App-Dateien werden bevorzugt aus dem Netzwerk geladen, um Versionskonflikte zu vermeiden.

Kein Nutzerkonto und keine eigenen gespeicherten Loadouts.

## 0.8.2 – vier Waffen statt einer

Für Spielmodus, Soldatenklasse und Waffenklasse werden jetzt **maximal vier unterschiedliche Waffen-Builds** angezeigt. Die Auswahl berücksichtigt zuerst die zur Soldatenklasse passende Signaturwaffenkategorie, danach die **Tier-Einstufungen der dokumentierten Community-Guides** und eine redaktionelle Reihenfolge. Ohne Soldaten- und Waffenklasse zeigt die App vier bewusst unterschiedliche Einstiegsempfehlungen.

- MP: BF Tactics, https://bftactics.com/weapons-database (Stand 15.10.2026), zusätzliche komplette Aufsatz-Builds für Sturmgewehre, SMGs, LMGs, Sniper, Karabiner, DMR und Schrotflinten.
- REDSEC: Battlefinity, https://battlefinity.gg/ und konkrete Waffen-Unterseiten, davon mehrere eigene REDSEC-Gunsmith-Konfigurationen (unterschiedliche Standdaten, teils älter).
- Rapid Royale: MP-Aufbau als qualitativ übertragene Empfehlung, **keine Rapid-spezifische Messung**.

Aktuell sind 62 Quellen-Builds hinterlegt. Auf dem Bildschirm erscheinen abhängig von den Filtern höchstens vier. Es gibt keinen Anspruch, dass eine Guide-Einstufung einen objektiv besten Aufsatz-Build beweist. TTK-Werte beschreiben weiterhin Grundwaffe/Quellenmodell, nicht die Aufsatz-Kombination. Bei weniger als vier belegten Builds wird kein Füllmaterial erfunden.

## 0.8.2 – Konsequente Qualitätsprüfung statt alter S-Tiers

**Warum SL9 nicht mehr empfohlen wird:** Der BF-Tactics-Tierguide vom 21.09.2026 führte die SL9 als S. Eine neuere Season-5-Matchstichprobe von INT.GG (Stand 18.10.2026) zeigt jedoch Meta-Score 26 von 100, KD 1,0 und 0,81 Kills/Minute. Ein Season-5-Tierguide (13.10.2026) bewertet sie als D. Dies sind Grundwaffen-Indikatoren aus einer Stichprobe, kein Aufsatz-Build-Beweis.

- Die Konfiguration ist in der Datenbasis aus Gründen der Nachvollziehbarkeit enthalten, aber als `not_recommended` markiert und erscheint nicht in Top-Build-Empfehlungen.
- Neue Datenquelle `data/weapon-evidence.json` enthält den Season-5-Abgleich für MPs. Im Multiplayer und Rapid (nur übertragene Empfehlungen) werden MP-Loadouts mit dokumentiertem Season-5-Meta-Score unter 45/100 vorerst nicht als Top-Pick angeboten. Dieser Qualitätsfilter ist eine redaktionelle Sicherheitsgrenze, keine offizielle Meta-Tier-Klassifikation und nicht für REDSEC-Rankings übertragbar.
- Bei der MP-Sortierung gewinnt die aktuelle Match-Stichprobe gegenüber der älteren Guide-Tier-Stufe. RSPR, SCW-10 und CZ3A1 werden vor schwach belegten Alt-Empfehlungen angeboten.
- PW7A2 ergänzt als vierte MP-Alternative mit vollständigem Gunsmith-Guide von BF Tactics.
- Weitere Klassen haben noch keinen vergleichbar vollständigen aktuellen Gegencheck. Dort können einzelne alte Tier-Bewertungen weiter unzuverlässig sein; diese sollen nach und nach modusspezifisch geprüft werden.

Quelle: https://int.gg/bf6/weapons (Season 5), https://worstguidesever.com/battlefield-6-siege-of-vegas-tier-list/ (13.10.), https://www.bftactics.com/weapon-tier-list (21.09.) und https://www.bftactics.com/weapons-database.

## 0.8.2: KTS100 MK8 und aktuelle LMG-Gegenprüfung

- Die KTS100 MK8 ist nun zusätzlich im Multiplayer und als nach MP abgeleitete Rapid-Empfehlung mit vollständigem, quellengestütztem BF-Tactics-Build hinterlegt (60er Magazin, schwerer 508-mm-Lauf, Stippled Stubby). Sie war bereits bei REDSEC vorhanden.
- Ein aktueller Z84M-Build wurde separat für MP/Rapid und REDSEC übernommen. Quelle: https://battlefinity.gg/weapon/BF6/z84m, Community-Loadout vom 14.10.2026.
- Für MP und Rapid wird die LMG-Reihenfolge anhand der neueren INT.GG-Season-5-Grundwaffenwerte gegengeprüft (Z84M 97, DRS-IAR 91, M123K 79, L110 72, KTS100 46). Diese Zahlen sind **keine Build-spezifischen** TTK-/Rückstoßmessungen und gelten nicht für REDSEC.
- Standardansicht weiterhin **vier Top-Empfehlungen**. Ein neuer Button „Weitere Waffen ansehen“ zeigt alle zusätzlichen Builds innerhalb der aktuellen Auswahl; bei Versorgung/LMGs weist der Button auf die KTS100 hin, sofern diese unter den Alternativen ist.
- Quelle: https://int.gg/bf6/tier-list (Season 5), https://bftactics.com/weapons-database (KTS100-Gunsmith), https://battlefinity.gg/weapon/BF6/kts100-mk8 (REDSEC-Build, teils älter).

## V0.9.0 – kompaktere Oberfläche

Große Werbeüberschrift, Modus- und Soldatenklassen-Erklärungen sowie ausführliche Karten-Prosa entfernt. Die App konzentriert sich auf: Modus, Soldatenklasse, Waffenklasse, vier Loadouts, kompakte TTK-Kennzahlen und die drei wichtigsten Aufsätze. Die übrigen Aufsätze sind je Build aufklappbar; Kopieren und Quellen sind weiterhin verfügbar. Die ausführlichen methodischen Hinweise bleiben gesammelt und eingeklappt in „Quellen & Hinweise“. Die vier Top-Builds, KTS100-Zusatzoption und Quellenprüfungslogik bleiben unverändert.

## V1.0.0 – Community-Build-Vergleich

Die Hauptansicht zeigt unverändert die vier priorisierten Waffen pro Filter. Jede Waffenkarte enthält jetzt zusätzlich **Build-Vergleich**: zwei der dokumentierten Community-Gunsmith-Konfigurationen lassen sich miteinander vergleichen. Der Vergleich enthält jede belegte Aufsatzposition, Magazininhalt, Visiervergrößerung und veröffentlichte Attachment Points.

**Belegter Stand 18.10.2026:** `data/build-variants.json` enthält 15 konkret auf individuellen Erstellerseiten geprüfte Konfigurationen für vier Waffen: KTS100 MK8 (4), DRS-IAR (4), M4A1 (4), PSR (3). Alle mit individuellen Quellenlinks zu https://bf6loadouts.com/weapons/builds. Andere Waffen zeigen vorerst nur den bisher hinterlegten Build statt erfundener 3–4 Varianten. REDSEC verwendet wegen abweichender Regeln **nicht** automatisch Multiplayer-Community-Builds; bei Rapid Royale wird ausdrücklich auf fehlende modusspezifische Validierung hingewiesen.

**Statistikdefinition:** Magazine sind aus belegten Produktnamen (z. B. 60RND) abgelesene Kapazitäten, Optik-Zoom ebenso aus den Bezeichnungen (z. B. Baker 3.00x). Attachment Points kommen direkt aus dem veröffentlichten Creator-Build. Die App rechnet Differenzen von Magazinen aus. Es werden **keine erfundenen TTK-, Rückstoß-, Streuungs- oder ADS-Effektprozentzahlen** aus bloßen Community-Builds erzeugt. Für modellgestützte Berechnungen ist der **BF6 Weapon Analyzer** separat verlinkt: https://raymdl.github.io/BF6-Weapon-Analyzer/ . Er kann mit manuell nachgestellten Aufsätzen Recoil, Handling, Spread usw. berechnen. Die Analyzer-Verlinkung ist keine automatisierte Integration oder Übernahme der aktuellen Build-Konfiguration.

**Votes sind nicht Pickrates:** Community-Bewertungen und Seitenaufrufe belegen weder reale Waffennutzung noch die Wirkung der Aufsätze. Die Anzeige vermeidet diese Verwechslung. Weitere vollständige Builds können mit individueller Prüfung nachgetragen werden.
