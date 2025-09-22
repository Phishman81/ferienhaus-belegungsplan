# Ferienhaus Belegungsplan

Ein schlanker, statischer Webkalender f&uuml;r Familien und Freunde, um den Belegungsplan des Ferienhauses transparent zu organisieren. Die Anwendung setzt auf Firebase (Auth + Firestore) und FullCalendar.

## Funktionen
- Monatskalender mit Echtzeit-Abgleich sowie kompakte Jahres&uuml;bersicht (FullCalendar, Firestore Snapshot Listener)
- Passwortloses Login via Firebase E-Mail-Link
- Rollen: Benutzer k&ouml;nnen buchen, Besitzer k&ouml;nnen zus&auml;tzlich l&ouml;schen
- Formularsicherheit: Honeypot, 3-Sekunden-Verz&ouml;gerung, clientseitiges Rate-Limit (3 Buchungen pro Stunde)
- Firebase App Check (reCAPTCHA v3) zur Bot-Abwehr
- Konfliktpr&uuml;fung gegen &uuml;berschneidende Buchungen
- Responsives Design (mobil zuerst), komplette UI auf Deutsch

## Projektstruktur
```
/
+- index.html
+- README.md
+- firestore.rules
+- assets/
   +- styles.css
   +- app.js
   +- calendar.js
   +- auth.js
   +- data.js
   +- security.js
   +- config.sample.js
```

## Einrichtung
1. Firebase Projekt erstellen und Firestore + Authentication aktivieren.
2. In der Konsole unter Authentication &raquo; Anmeldemethoden: "E-Mail-Link (passwortlos)" aktivieren.
3. App Check mit reCAPTCHA v3 aktivieren und den Site Key notieren.
4. `assets/config.sample.js` nach `assets/config.js` kopieren und die eigenen Werte f&uuml;llen:
   - `firebaseConfig`: Werte aus den Firebase Projekteinstellungen
   - `appCheckSiteKey`: reCAPTCHA v3 Site Key
   - `ownerWhitelist`: E-Mail-Adressen der Besitzer (z. B. Patrick und Markus)
5. FullCalendar und Firebase werden per CDN geladen, es sind keine Build-Tools notwendig.

## Firestore Regeln
Laden Sie den Inhalt von `firestore.rules` in die Firebase Konsole hoch (siehe Datei im Projektstamm). Die Regeln erzwingen:
- Lesen f&uuml;r alle erlaubt
- Schreiben nur bei valider Authentifizierung + App Check
- L&ouml;schen exklusiv f&uuml;r Besitzer-Adressen
- Updates verboten

## Entwicklung & Test
- Projektordner mit einem lokalen Webserver ausliefern (z. B. `npx serve` oder ein Hosting Ihrer Wahl). Firestore ben&ouml;tigt HTTPS.
- Nach erfolgreicher Anmeldung wird die E-Mail oben rechts angezeigt.
- Besitzer sehen im Tooltip bzw. per Klick die L&ouml;schfunktion.

## Deployment
- Jeder statische Hoster gen&uuml;gt (Firebase Hosting, Netlify, Vercel, GitHub Pages). Stellen Sie sicher, dass `config.js` **nicht** ins Repository eingecheckt wird.
- App Check Credential und Firebase API-Key gelten als &ouml;ffentlich einsetzbar (Frontend). Weitere Sicherheit liefern Firestore-Regeln.

## Wartung / Betrieb
- Eigent&uuml;mer-E-Mails im `ownerWhitelist` Feld aktualisieren, falls notwendig.
- Firebase Console auf Fehlermeldungen & Rate-Limits pr&uuml;fen.
- Optionale Weiterentwicklungen laut PRD: Admin-Export, Benachrichtigungen, Mehrsprachigkeit, Bearbeitung bestehender Buchungen.
