# BF6 META – Loadout Lab und WIN/LOST Tracker

Aktuelle App-Version **2.0.2**. Unabhängiges, kostenloses Battlefield-6/REDSEC-Fanprojekt.

## Drei aktive Spieler zentral erfasst (V2.0.2)

Die stündliche GameTools-Rapid-Royale-Aufzeichnung umfasst genau die drei anhand der Screenshots erfolgreich geladenen Spieler: **Strausbrot** (Plattformcode `ea`, in der App EA/PC), **RockmasterR** (`ea`) und **Pathogeno** (`psn`, mit bereits implementiertem EA/PC-Fallback bei HTTP 404). Die zentrale Liste in `data/rapid-players.json` ist in dieser Reihenfolge gespeichert. Beim nächsten Öffnen der Webseite werden diese Spieler ohne erneute manuelle Eingabe auf dem Gerät hinzugefügt; bestehende lokale Messstände werden nicht gelöscht.

Im gezeigten Screenshot hatte Strausbrot 35 Wins/124 Losses/562 Kills, RockmasterR 36 Wins/121 Losses/1328 Kills und Pathogeno 15 Wins/30 Losses/198 Kills. Diese Werte werden nicht als historische Servermessungen importiert, weil der Screenshot allein keinen rückverfolgbaren API-Zeitstempel liefert. Die serverseitige Historie wird nur durch tatsächliche automatisierte API-Abrufe fortgeschrieben. Das bisherige RockmasterR-Archiv bleibt unverändert; für Strausbrot und Pathogeno beginnt die Serverhistorie mit dem ersten erfolgreichen stündlichen Lauf.

## Reparatur des Tagesfensters (V2.0.1)

Fehler in V2.0.0: `periodStats` nahm `Date.now() - 24 Stunden` als Zielzeitpunkt, verlangte aber zusätzlich, dass der letzte API-Messstand höchstens vier Stunden alt sein durfte. Bei GitHub-Action-Pausen (beispielsweise 25.10. 06:22 UTC bis 26.10. 06:40 UTC) scheiterte deshalb selbst ein sehr gut passender 24-Stunden-Vergleich. Nun werden Zielzeitpunkt und Vergleich ausschließlich relativ zum zuletzt wirklich gespeicherten Messstand berechnet. Innerhalb einer Toleranz von 6 Stunden wird der zeitlich nächste passende Messstand derselben Serie genutzt. Der wirkliche Zeitbereich und seine Länge werden sichtbar angegeben, ebenso ein Warnhinweis, wenn der jüngste API-Abruf bereits älter als drei Stunden ist. Die Statistik besteht weiterhin nur aus echten Zählerdifferenzen, ohne erfundene oder nachträglich interpolierte Werte. Für 7 Tage bleiben historische Vergleichsmessungen erforderlich.

## Zwei-Runden-Livevergleich (V2.0.0)

In der Rapid-Royale-Verlaufsansicht gibt es einen separaten Live-Test für genau zwei geplante Runden. Zuerst „Startwert laden“ antippen: Die App ruft live echte Rapid-Royale-Statistiken des gewählten Spielers ab und speichert die absoluten Zähler mit Zeitstempel lokal. Dann zwei Runden spielen und „Nach 2 Runden prüfen“ antippen: Die App ruft live neu ab und zeigt Differenzen bei Wins, Losses, Kills, Deaths, Winrate und K/D seit dem Startwert. Wenn erst 0 oder 1 Match von der API erfasst wurde oder mehr als zwei neue Matches auftauchen, kennzeichnet sie dies ausdrücklich. Es werden keine Werte simuliert.

Der Test übersteht App-Neustarts und ist pro Spieler getrennt. Ein neuer Klick auf „Startwert laden“ überschreibt absichtlich den bisherigen Teststart für den ausgewählten Spieler. Match-Modus oder Saison müssen zwischen zwei Abrufen gleich bleiben, ansonsten werden keine irreführenden Werte verglichen. Ein Tagesvergleich über die echten vergangenen 24 Stunden bleibt unabhängig davon und benötigt weiterhin den älteren historischen API-Messstand.

## Korrektur Spielerbestand (V1.9.1)

RockmasterR bleibt auf Wunsch des Nutzers als EA/PC-Spieler in der zentralen Liste und wird weiterhin durch den stündlichen Workflow abgefragt. Nur die alten BOT-Namen strausbot und botuturn sowie die alte Schreibweise rockbotmasterR werden aus der Vorbelegung entfernt. Bereits erfasste lokale RockmasterR-Spielerdaten bleiben erhalten. Falls Version 1.9.0 RockmasterR zwischenzeitlich aus der lokalen Spielerauswahl entfernt hat, fügt der nächste Abruf der zentralen Liste RockmasterR wieder hinzu.

## Spieler-Formular unten und Standard-BOT-Namen entfernt (V1.9.0)

Das Formular „Spieler hinzufügen“ befindet sich nun als eigenständiger Abschnitt ganz unten vor dem Footer. Die vorhandene ausklappbare Statistikliste zeigt weiterhin eingetragene Profile und lässt sie entfernen. Die zunächst fest voreingetragenen BOT-Namen strausbot und botuturn wurden aus `data/rapid-players.json` entfernt. RockmasterR bleibt als verifizierter EA-Spieler zentral hinterlegt. Eine einmalige Browser-Migration blendet die BOT-Namen aus (auch die alte Schreibweise rockbotmasterR), aber nicht RockmasterR. Frühere manuelle Matches und bereits gespeicherte Statistikmessungen werden archiviert und nicht gelöscht. Danach selbst hinzugefügte Spieler bleiben bestehen.

Der stündliche GitHub-Workflow erfasst weiterhin RockmasterR. Bei einer leeren zentralen Spielerliste würde er erfolgreich ohne Änderungen an der historischen JSON durchlaufen. Neue Spieler im Webformular werden zunächst nur lokal gespeichert und über die API live abgefragt. Damit ein Spieler stündlich im Hintergrund erfasst wird, muss sein Name und die richtige Plattform in der zentralen Konfiguration `data/rapid-players.json` eingetragen werden. Die statische GitHub-Pages-App kann nicht anonym das zentrale GitHub-Repository verändern.

## PlayStation-Spielerauflösung (V1.8.0)

GameTools unterstützt Battlefield-6-Plattformcodes `psn`, `ps5`, `ps4` und `ea`. Die Browserabfrage und der stündliche Datensammler versuchen beim HTTP-404-Fehler für PlayStation in dieser Reihenfolge: `psn`, `ea`, `ps5`, `ps4`. Bei einem erfolgreichen ersten Abruf werden keine unnötigen Folgeanfragen gestellt. Bei HTTP-404 in allen Varianten gibt es eine konkrete Fehlermeldung, denn eine PSN-Online-ID kann von der EA-ID abweichen. Andere HTTP-Fehler lösen keine Plattform-Fallback-Kette aus.

Nur eindeutig der Rapid-Royale-Statistik zugeordnete Zähler werden angezeigt. Diese Änderung garantiert nicht, dass ein abweichender oder unbekannter PSN-Name ohne die korrekte EA-ID gefunden werden kann. Die API-Antwort eines echten PlayStation-Kontos war zum Zeitpunkt der Codeänderung nicht verifiziert.

## Serverbasierte stündliche Rapid-Royale-Historie (V1.7.0)

`.github/workflows/rapid-hourly.yml` führt nach einem stündlichen UTC-Cron den Sammler `scripts/collect-rapid-history.mjs` aus. Der Sammler übernimmt ausschließlich eindeutig Rapid Royale zugeordnete GameTools-Zähler und schreibt sie nach `data/rapid-history.json`. Der Workflow benötigt GitHub Actions und Schreibzugriff im Repository. GitHub-Schedules können verspätet starten oder bei Inaktivität deaktiviert sein. Der Workflow kann auch über GitHub Actions manuell gestartet werden.

Die zentrale Spielerliste `data/rapid-players.json` enthält zunächst RockmasterR mit EA/PC sowie die vom Benutzer genannten Namen strausbot und botuturn über EA (die beiden letzteren EA-ID-Zuordnungen sind noch unbestätigt). Fehlgeschlagene Einzelabfragen überschreiben keine bestehenden Zähler. Falls kein Spieler valide Rapid-Royale-Daten liefert, schlägt der Job fehl.

Beim Öffnen lädt die App die zentral konfigurierten Spieler und vorhandene Servermessungen, ohne lokale Einträge zu löschen. Die 24-Stunden- und 7-Tage-Auswertungen nutzen vorzugsweise die gemeinsame Historie, auch nach Schließen des Browsers und auf anderen Geräten. Bei fehlenden Messständen, zu alten Daten oder einem Zählerreset werden keine Werte erfunden. Lokale Spieler, die nur in der Webseite hinzugefügt werden, sind nicht automatisch Teil der zentralen serverseitigen Erfassung. Für sie muss die GitHub-Konfiguration ergänzt werden.

Die Einrichtung des Workflows bedeutet noch nicht, dass ein geplanter Lauf tatsächlich erfolgreich war. Der erste erfolgreiche Lauf ist anhand der GitHub Actions Runs und eines neuen Zeitstempels in `data/rapid-history.json` zu überprüfen.

## Gemessener Tages- und Wochenverlauf ohne manuelle Match-Eingabe (V1.6.0)

Die manuelle WIN/LOST-Erfassung, Filter und manuelle Historie sind aus der Benutzeroberfläche entfernt. Bereits erfasste lokale Daten bleiben im ursprünglichen lokalen Speicher erhalten und werden nicht mit API-Werten vermischt.

Nach erfolgreichen GameTools-API-Abrufen werden pro EA-ID Rapid-Royale-Messstände lokal gespeichert. Tages- und Wochenansicht zeigen echte Differenzen bei Wins, Losses, Kills, Deaths und daraus berechnete Winrate und K/D. Die Vergleichsfenster sind 24 Stunden und 7 Tage, mit begrenzter Messtoleranz. Wenn ein passender Vergleichswert fehlt oder Gesamtzähler zurückgesetzt wurden, werden statt erfundener Zahlen Striche angezeigt. Neue Messstände kommen nur hinzu, wenn die App geöffnet und die API erreichbar ist, maximal im 15-Minuten-Abstand bei unveränderten Werten. Die Daten bleiben pro Browser lokal und werden nicht mit Freunden synchronisiert.

GameTools stellt für BF6 derzeit `/bf6/stats/` mit Modusaufschlüsselung zur Verfügung. Ein persönlicher BF6-`statsarray`-Endpunkt mit rückwirkendem Tagesverlauf ist nicht dokumentiert. `/bf6/statusarray/` beschreibt globale Server-/Spielerzahlen, keine persönlichen Werte. Historische Rapid-Royale-Ergebnisse vor dem Beginn der eigenen Aufzeichnung können nicht berechnet werden.

## Automatische Rapid-Royale-Bilanz als Startbildschirm (V1.5.0)

Die Hauptansicht des Trackers zeigt automatisch geladene Rapid-Royale-Gesamtstatistiken für einen auswählbaren, hinterlegten Spieler. Wins, Losses, Winrate und Matchanzahl stammen aus den echten pro Modus separierten GameTools-Zählern. Werden keine eigenen Rapid-Werte geliefert, bleiben die Felder leer. Aktualisierung beim Öffnen, bei Rückkehr in den Vordergrund und alle zwei Minuten, solange die Website sichtbar geöffnet bleibt. Nach dem Schließen gibt es keinen Hintergrundabruf. Der zuletzt ausgewählte Spieler wird lokal gespeichert.

Die bisherige manuelle WIN/LOST-Erfassung mit Mitspielern und Matchhistorie bleibt unverändert vorhanden, jedoch eingeklappt als optionaler Bereich. Bisherige Einträge gehen nicht verloren. Manuelle Einträge werden nicht zu den automatisch geladenen Gesamtzahlen addiert. Aus Statistikaggregaten lassen sich weder chronologisch eindeutige Einzelmatches noch beteiligte Teamkollegen rekonstruieren. Eine automatische Einzelmatch-Historie ist nicht belegt.

## Spielerauflösung und klare HTTP-404-Fehler (V1.4.0)

HTTP 404 bedeutet beim Abruf: Der Spieler konnte mit diesem Namen und der Plattform nicht aufgelöst werden. Das ist kein CORS-Fehler. Für Xbox-Namen erfolgt bei HTTP 404 automatisch ein zweiter Abruf mit Plattform `ea`, weil die BF6-API EA- und Xbox-Spieler derselben Statistikplattform zuordnet. Ein erfolgreicher Fallback wird neben den Daten gekennzeichnet. Der Spielername selbst wird nicht geändert. Bei 404 weist die UI auf die exakte EA-ID statt Gamertag hin. Auch ein gefundener Spieler ohne Rapid-Royale-Modusstatistiken führt niemals zu angezeigten Gesamtwerten.

## Rapid Royale separat (V1.3.0)

Der API-Spielerbereich zeigt ausschließlich Spielmoduswerte von Rapid Royale an. Die GameTools-Anfrage nutzt jetzt `seperation=true` (Schreibweise der API), um die Modus-Trennung abzufragen. Werte werden nur aus explizit als Rapid Royale bezeichneten Datenobjekten gelesen. Kann die API den Modus nicht gesondert liefern, bleiben die Spielerfelder leer. Saisonwerte werden entsprechend gekennzeichnet. Die manuelle WIN/LOST-Historie bleibt unverändert und kann weiterhin alle Modi erfassen.

Der Live-API-Abruf konnte beim Release nicht mit einem echten Rapid-Royale-Spielerprofil bestätigt werden. Gesamtwerte werden absichtlich nicht als Rapid-Daten ausgegeben.

## Mitgewinner je Sieg auswählen (V1.2.0)

Beim Eintragen eines WINs können die Mitspieler \`rockbotmasterR\`, \`strausbot\` und \`botuturn\` unabhängig voneinander ausgewählt werden. Die Auswahl bleibt für folgende Siege aktiv und wird beim jeweiligen WIN als Momentaufnahme gespeichert. Bei LOST werden keine Mitspieler gespeichert. In der Match-Historie sind die Mitgewinner sichtbar und nachträglich über das Stiftsymbol korrigierbar. Der CSV-Export enthält jetzt die Spalte „Mitgewonnen“. Bestehende Siege ohne Mitspieler bleiben unverändert und können nachbearbeitet werden.

## WIN/LOST Tracker (V1.1.0)

Die Startseite verlinkt auf `tracker.html`. Dort können Battlefield-6-Runden mit genau zwei großen Buttons als WIN oder LOST erfasst werden. Die Historie zeigt Siegquote, Siege, Niederlagen und aktuelle Serie. Filter nach Multiplayer, Rapid Royale und Battle Royale, Undo und CSV-Export sind enthalten. Die Historie wird ausschließlich im Browser auf dem jeweiligen Gerät gespeichert. Es gibt noch keine Synchronisierung zwischen Geräten.

Ein eigener aufklappbarer Bereich ruft pro EA-ID und Plattform Spielerstatistiken über die Community-API https://api.gametools.network/bf6/stats/ ab. Felder ohne Antwort werden als Strich angezeigt. Browser-CORS oder API-Ausfälle können den Abruf verhindern. Die Account-Statistiken sind keine automatisch erfassten Einzelmatch-Resultate. Der API-Liveabruf wurde bei diesem Release nicht end-to-end verifiziert.

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
