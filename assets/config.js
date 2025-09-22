// assets/config.js

export const firebaseConfig = {
  apiKey: "AIzaSyD4gFjMp1166C_y3Q1--NQLJ_pLhhh_k-8",
  authDomain: "ferienhaus-belegungsplan.firebaseapp.com",
  projectId: "ferienhaus-belegungsplan",
  storageBucket: "ferienhaus-belegungsplan.appspot.com",
  messagingSenderId: "268588720447",
  appId: "1:268588720447:web:c71b1b7526c722b71e738a"
};

// App Check Site Key (den bekommst du gleich, wenn du App Check aktivierst)
export const appCheckSiteKey = "6LdI89ErAAAAACbtTIWXJ4KMkO_PXYzKHzk-0VSX";

// Whitelist der Besitzer-E-Mails
export const ownerWhitelist = [
  "p.schmidt81@gmail.com",
  "markus.rister@t-online.de"
];

// Action URL für den Magic-Link-Login
export const actionCodeSettings = {
  url: "https://phishman81.github.io/ferienhaus-belegungsplan/",
  handleCodeInApp: true
};
