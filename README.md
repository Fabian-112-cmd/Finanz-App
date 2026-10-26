# Meine Finanzen

Private Finanzübersicht als statische Web-App für GitHub Pages.

## Auf GitHub Pages veröffentlichen
1. Neues Repository auf GitHub erstellen.
2. `index.html` und `README.md` aus dieser ZIP in das Hauptverzeichnis des Repositorys hochladen (nicht die ZIP selbst).
3. Unter **Settings → Pages** bei **Build and deployment** die Quelle **Deploy from a branch**, Branch **main** und Ordner **/(root)** auswählen und speichern.
4. Nach der Veröffentlichung den angezeigten GitHub-Pages-Link öffnen.

## Wichtige Hinweise
- Alle Finanzdaten liegen nur im `localStorage` des jeweiligen Browsers. Es gibt **keine Anmeldung, keine Verschlüsselung, keine Cloud-Synchronisierung**.
- Der GitHub-Code ist nicht mit den lokal eingegebenen Finanzdaten identisch. Dennoch keine Bankdaten oder Backups in das Repository hochladen.
- Unter **Daten & Sicherheit** regelmäßig ein JSON-Backup herunterladen und geschützt aufbewahren.
- CSV-Import verarbeitet Dateien lokal im Browser; importierte Kategorien und Beträge prüfen.
- GitHub Pages eignet sich für die statische App, bietet aber allein keinen privaten Benutzer-Login.
