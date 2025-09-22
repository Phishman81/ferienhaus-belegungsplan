import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js";

let appCheckInstance = null;

export function initAppCheckGuard(app, siteKey) {
  if (!app) {
    console.warn("App Check nicht initialisiert: Firebase App fehlt.");
    return null;
  }
  if (!siteKey || siteKey.startsWith("YOUR_")) {
    console.warn("App Check nicht initialisiert: Site Key fehlt.");
    return null;
  }
  if (appCheckInstance) {
    return appCheckInstance;
  }
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.error("App Check Initialisierung fehlgeschlagen", error);
  }
  return appCheckInstance;
}

export function validateHoneypot(value) {
  if (value === undefined || value === null) {
    return true;
  }
  return String(value).trim() === "";
}

export function createRateLimiter(limit, windowMs, storageKey = "fh-booking-attempts") {
  const safeLimit = Math.max(1, limit || 1);
  const safeWindow = Math.max(windowMs || 0, 0);

  function readStore() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn("Rate Limiter Speicher nicht verf&uuml;gbar", error);
      return {};
    }
  }

  function writeStore(data) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn("Rate Limiter konnte nicht schreiben", error);
    }
  }

  function clean(list, now) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((timestamp) => now - timestamp < safeWindow);
  }

  function canAttempt(identifier) {
    const key = (identifier || "anonymous").toLowerCase();
    const now = Date.now();
    const store = readStore();
    const history = clean(store[key] || [], now);

    store[key] = history;
    writeStore(store);

    if (history.length >= safeLimit) {
      const earliest = history[0];
      const retryIn = Math.max(safeWindow - (now - earliest), 0);
      return { allowed: false, retryIn };
    }

    return { allowed: true };
  }

  function recordAttempt(identifier) {
    const key = (identifier || "anonymous").toLowerCase();
    const now = Date.now();
    const store = readStore();
    const history = clean(store[key] || [], now);

    history.push(now);
    store[key] = history.slice(-safeLimit);
    writeStore(store);
  }

  return { canAttempt, recordAttempt };
}

export function waitForMinimumDelay(ms) {
  const value = Math.max(ms || 0, 0);
  return new Promise((resolve) => {
    window.setTimeout(resolve, value);
  });
}
