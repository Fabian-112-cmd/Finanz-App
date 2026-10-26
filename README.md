# Meine Finanzen – Design 2 / Passwortschutz

## GitHub Pages
ZIP entpacken und **alle Dateien** im Repository hochladen (index.html, Bilder, Manifest). Bestehende Dateien überschreiben, GitHub Pages auf main / (root).

## Sicherheit
Beim ersten Öffnen auf HTTPS (GitHub Pages) ein Passwort mit mindestens 10 Zeichen anlegen. Bestehende Daten im selben Browser werden einmalig in einen AES-256-GCM-verschlüsselten lokalen Tresor übernommen (Schlüsselableitung PBKDF2-SHA256, 250.000 Iterationen). Passwort wird nicht gespeichert. Über 'App sperren' wieder zur Passwortabfrage. Kein Server, keine Synchronisierung, kein Passwort-Reset. Passwortverlust bedeutet Datenverlust, sofern kein Backup vorhanden ist.

**Wichtig:** GitHub Pages veröffentlicht den Quellcode öffentlich. Die Daten werden verschlüsselt ausschließlich im Browser des jeweiligen Geräts gespeichert. Ein lokaler Passwortschutz ist kein serverseitiger Benutzerlogin und schützt nicht gegen kompromittierte Geräte oder schädliche Browser-Erweiterungen.

Backups als JSON werden unverschlüsselt heruntergeladen. Sichere sie vertraulich. Vor dem Update Backup anfertigen. Nach einem Browserwechsel ist das lokale Tresor-Archiv nicht automatisch verfügbar; Daten über Backup importieren. 
