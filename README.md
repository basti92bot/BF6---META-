# BF6 Meta

Mobile-first Battlefield 6 Waffenanalyse als installierbare Progressive Web App (PWA).

## Version 0.1

- 31 Waffen aus einer frei verfügbaren Community-Messreihe
- Rangliste nach Distanz (0, 20, 35, 75 Meter), Such- und Klassenfilter
- Zwei Waffen vergleichen: TTK, RPM, BTK und Projektilgeschwindigkeit
- EA-Updateübersicht und transparente Angaben zum Datenstand
- Täglicher GitHub-Actions-Abgleich von EA-Patchnotes und Community-CSV
- Keine Registrierung und keine persönlichen Loadouts

## Start

Die Dateien als statische Website veröffentlichen, zum Beispiel über GitHub Pages unter Settings > Pages. Lokal mit einem HTTP-Server testen: python -m http.server 8000

## Daten und Grenzen

Quelle: https://github.com/bdeland/bf6_guns, MIT-Lizenz. Der Datensatz basiert laut README des Quellprojekts auf Messungen von u/Mastahamma. Siehe THIRD_PARTY_NOTICES.md.

Offizielle News: https://www.ea.com/games/battlefield/battlefield-6/news?type=game-updates

Die Community-Messreihe ist nicht garantiert aktuell. Die Tier-Bewertungen sind eine eigene heuristische Einordnung auf Grundlage von TTK und gemessenen Accuracy-Koeffizienten, keine bestätigte Competitive-Meta. Patch-Erkennung verändert die Waffenwerte nicht eigenmächtig. Bei Änderungen oder Datenfehlern zeigt die App Prüfbedarf. Neue Messwerte werden nur übernommen, wenn grundlegende Format- und Plausibilitätsprüfungen bestehen.

Die täglichen Checks laufen per GitHub Actions um 07:17 UTC. GitHub kann geplante Workflows verzögern. Prüfe einen erfolgreichen Lauf unter Actions.

## Dateien

- data/weapons.json: gespeicherte Messwerte
- data/status.json: Patch-Version, Quelländerungen, Fehler und Datenstatus
- scripts/check-sources.mjs: täglicher Abgleich
- .github/workflows/daily-check.yml: Zeitplan und Git-Commit bei Änderungen

## Deployment

1. Unter Settings > Pages GitHub Pages für main (Root /) aktivieren, sofern der GitHub-Plan dies zulässt.
2. Unter Actions den Workflow Daily BF6 source check einmal manuell starten.
3. Ergebnis unter Actions und den Datenstand in der App prüfen.
4. Auf dem iPhone in Safari öffnen und Zum Home-Bildschirm hinzufügen.

Bei privaten Repositories ist GitHub Pages vom GitHub-Plan abhängig. Alternativ über einen anderen statischen Hoster bereitstellen.
