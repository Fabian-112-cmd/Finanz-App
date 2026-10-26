# Meine Finanzen – Version 3.0

Private Finanz-App für GitHub Pages mit Vollbild-Design, Rechnungsregister, Notizen, Sparbüchern und eigenem iPhone-App-Icon.

## Installation
ZIP entpacken und **alle Dateien aus dem Ordner** ins Root-Verzeichnis des GitHub-Repositories hochladen. Bei GitHub Pages `main` und `/ (root)` einstellen. Zum Aktualisieren vorhandene Dateien ersetzen. iPhone: in Safari öffnen → Teilen → Zum Home-Bildschirm.

## Daten
Die App speichert lokal im Browser (localStorage, Schlüssel `finanz-app-v1`) und behält deshalb die bisherigen Daten bei derselben URL und demselben Browser. Vor dem Update JSON-Backup herunterladen. Keine Synchronisierung, kein Login, kein tatsächlicher Bankzugriff.

## Sparbuch
Daueraufträge werden rechnerisch ab Startmonat bis Endmonat (inklusive) angesetzt. Keine echten Überweisungen; Buchungen auf dem Girokonto werden nicht automatisch mit dem Sparbuch abgeglichen. Manuelle Einzahlungen zusätzlich eintragen, ohne Daueraufträge doppelt zu erfassen. Keine Zinsberechnung.

## Rechnungen
Offen/bezahlt als Register; ohne automatische Verknüpfung mit Buchungen.

## Datenschutz
GitHub-Pages-Seite ist öffentlich; Finanzdaten verbleiben lokal auf dem jeweiligen Gerät. JSON-Backups sind unverschlüsselt.
