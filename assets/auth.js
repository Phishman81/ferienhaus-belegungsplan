import {
  browserLocalPersistence,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const STORAGE_KEY = "fh-booking-email";

export function initAuth(app, ownerWhitelist = []) {
  const auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);

  const ownerEmails = ownerWhitelist
    .map((email) => (email || "").toLowerCase().trim())
    .filter(Boolean);

  async function sendMagicLink(rawEmail) {
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email) {
      throw new Error("E-Mail-Adresse fehlt");
    }

    const actionCodeSettings = {
      url: `${window.location.origin}${window.location.pathname}`,
      handleCodeInApp: true
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem(STORAGE_KEY, email);
  }

  async function completeSignInIfNeeded() {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return null;
    }

    let email = window.localStorage.getItem(STORAGE_KEY);
    if (!email) {
      email = window.prompt("Bitte E-Mail-Adresse zur Anmeldung eingeben");
      if (!email) {
        return null;
      }
    }

    const result = await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(STORAGE_KEY);

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);

    return result.user;
  }

  function subscribe(callback) {
    return onAuthStateChanged(auth, callback);
  }

  function signOutUser() {
    return signOut(auth);
  }

  function isOwner(user) {
    if (!user || !user.email) {
      return false;
    }
    return ownerEmails.includes(user.email.toLowerCase());
  }

  return {
    auth,
    sendMagicLink,
    completeSignInIfNeeded,
    onAuthStateChanged: subscribe,
    signOut: signOutUser,
    isOwner
  };
}
