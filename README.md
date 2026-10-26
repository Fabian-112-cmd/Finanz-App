# Meine Finanzen – Supabase Edition / Design 2

## Veröffentlichung
1. Bestehende GitHub-App-Dateien im Repository `Finanz-App` durch **alle Dateien aus dieser ZIP** ersetzen. Die Dateien müssen direkt im Repository-Stamm liegen, nicht in einem Unterordner.
2. Commit changes. GitHub Pages öffnen; ggf. 1–3 Minuten warten und Browser aktualisieren.
3. Mit der **E-Mail-Adresse und dem Passwort** des bereits unter Supabase → Authentication → Users angelegten Benutzers anmelden.
4. Erst unter „Konten & Sparbücher“ ein Girokonto mit Startguthaben und Stichtag anlegen. Danach Buchungen und Fixkosten erfassen.

## Supabase
- Projekt: `Meine-Finanzen` (eigenständig von Weintour)
- `app.js` enthält ausschließlich Projekt-URL und **Publishable Key**, keine Secret Keys.
- Voraussetzung: Das zuvor im SQL Editor ausgeführte Datenbankschema mit Tabellen `finance_*`, RLS-Policies und dem privaten Finanzbereich.
- Wenn die Anmeldung nicht klappt, prüfen, ob der Benutzer in Authentication → Users tatsächlich eine nutzbare E-Mail/Passwort-Identität besitzt.
- GitHub Pages ist öffentlich zugänglich, **Finanzdaten** liegen ausschließlich in der durch Auth und RLS geschützten Supabase-Datenbank. App-Quellcode ist öffentlich.

## Funktion
- Kontostand: Startguthaben plus bestätigte Buchungen seit Stichtag; regelmäßige Zahlungen sind **Prognosen**, keine automatisch bestätigten Kontobewegungen.
- Gehaltszeitraum: Monatswahl legt Beginn auf Gehalts-Stichtag; endet einen Tag vor dem nächsten Gehalts-Stichtag. Der tatsächliche Gehaltseingang wird separat gebucht.
- Sparbücher als eigene Konten; Umbuchung erzeugt zwei korrespondierende Transaktionen und zählt nicht als Einnahme/Ausgabe.
- Rechnungsstatus ist getrennt von Kontobuchungen.
- PDF: Drucken / im Druckdialog „Als PDF speichern“.
- CSV-Import: Einfaches CSV mit `Datum`, `Bezeichnung`, `Betrag` (Semikolon/Komma; Datum ISO oder TT.MM.JJJJ). Prüfe vor Import Konto und Dubletten; für komplexe Bankdateien muss Importformat ggf. erweitert werden.
- JSON-Backup ist unverschlüsselt und enthält vertrauliche Daten. Sicher verwahren.
- Gemeinsame Bereiche sind **datenbankseitig vorbereitet**, aber Einladung und Rollenverwaltung noch nicht aktiviert. Anfangs ist ausschließlich der private Bereich nutzbar.
- Face ID: iOS kann die E-Mail/Passwort-Anmeldung über den Schlüsselbund und Face ID automatisch ausfüllen; es ist noch **kein nativer Passkey-Login**.

## Wichtig
Die neue App nutzt Supabase anstelle des früheren lokalen Browser-Speichers. Da noch keine echten Daten in der bisherigen App eingetragen wurden, ist keine Datenmigration notwendig.

## Korrektur Projektadresse
Supabase-Projekt-URL berichtigt auf `https://fvdjuavvandzshepwjkb.supabase.co`. Das API-Suffix `/rest/v1/` gehört nicht zur Client-Basisadresse.

## Update: Kategorien
Kategorie-Einträge werden bei einer bereits vorhandenen Kategorie wiederverwendet (Fehler 23505). Kein SQL-Update notwendig. Bestehende Konten und Buchungen bleiben unverändert.
