Meine Finanzen v7 – kompakteres iPhone + Update-Prüfung

Alle Dateien aus der ZIP direkt ins Hauptverzeichnis von GitHub/Finanz-App hochladen (einschließlich sw.js und version.json). Nicht die ZIP selbst hochladen.

Wichtig: GitHub Pages braucht nach dem Commit eventuell ein paar Minuten. Nach EINMALIGEM Laden dieser Version prüft die App beim erneuten Öffnen, ob eine neue Version veröffentlicht ist. Für spätere Updates muss die version.json einen neuen Wert erhalten und der Wert VERSION im index.html dazu passen. app.js muss mit neuer Versionskennung referenziert werden.

Die Versionsprüfung und der Service Worker nutzen Netzwerkzugriff und speichern keine Finanzdaten. Offline ist die App damit nicht verfügbar. Ein älteres, bereits geöffnetes Home-Bildschirm-Icon kann diese neue Logik erst nutzen, nachdem die neue Version einmal geladen wurde. Wenn iOS trotzdem dauerhaft eine alte Version festhält, kann eine einmalige Neuinstallation des Icons nötig sein.

PC-Layout und Supabase-Tabellen bleiben unverändert. Kein SQL nötig.

Version 8: Einnahmen-Kachel nur aus der Hauptuebersicht entfernt. Berechnungen und andere Ansichten unveraendert.
