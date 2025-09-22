// Kopieren Sie diese Datei zu config.js und tragen Sie Ihre Firebase Einstellungen ein.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// App Check Site Key (reCAPTCHA v3). Pflicht f&uuml;r produktiven Betrieb.
export const appCheckSiteKey = "YOUR_APPCHECK_SITE_KEY";

// Whitelist der Besitzer-E-Mails, die Buchungen l&ouml;schen d&uuml;rfen.
export const ownerWhitelist = [
  "owner@example.com",
  "cousin@example.com"
];
