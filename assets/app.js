// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initAuth } from "./auth.js";
import { initData } from "./data.js";
import { createCalendar } from "./calendar.js";
import {
  createRateLimiter,
  initAppCheckGuard,
  validateHoneypot,
  waitForMinimumDelay
} from "./security.js";

import * as CONFIG from "./config.js"; // immer echte Config laden

// Firebase + App Check initialisieren
const firebaseApp = initializeApp(CONFIG.firebaseConfig);
initAppCheckGuard(firebaseApp, CONFIG.appCheckSiteKey);

// Debug-Ausgabe, um sicherzugehen dass Keys wirklich geladen werden
console.log("firebaseConfig at runtime:", CONFIG.firebaseConfig);

const authService = initAuth(firebaseApp, CONFIG.ownerWhitelist);
await authService.completeSignInIfNeeded().catch((error) => {
  console.error("Anmeldung konnte nicht abgeschlossen werden", error);
});

const dataService = initData(firebaseApp);
const rateLimiter = createRateLimiter(3, 60 * 60 * 1000);
const state = {
  user: null,
  isOwner: false,
  bookings: []
};

const dom = {
  calendar: document.getElementById("calendar"),
  bookingForm: document.getElementById("booking-form"),
  loginForm: document.getElementById("login-form"),
  loginToggleBtn: document.getElementById("login-toggle-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  loginMessage: document.getElementById("login-message"),
  formMessage: document.getElementById("form-message"),
  userEmail: document.getElementById("user-email"),
  loginEmailInput: document.getElementById("login-email"),
  formEmailInput: document.getElementById("email"),
  submitButton: document.querySelector("#booking-form button[type='submit']"),
  viewToggleButtons: Array.from(document.querySelectorAll(".view-toggle-btn"))
};

let lastMonthAnchor = new Date();

const calendar = createCalendar(dom.calendar, {
  onDelete: handleDeleteBooking,
  isOwnerChecker: () => state.isOwner
});
lastMonthAnchor = calendar.getDate();
const stopViewChangeListener = calendar.onViewChange(handleCalendarViewChange);

const unsubscribeBookings = dataService.subscribeToBookings((bookings) => {
  state.bookings = bookings;
  calendar.update(bookings);
});

authService.onAuthStateChanged((user) => {
  state.user = user;
  state.isOwner = authService.isOwner(user);
  updateAuthUI();
});

dom.bookingForm.addEventListener("submit", handleBookingSubmit);
dom.loginForm.addEventListener("submit", handleLoginSubmit);
dom.loginToggleBtn.addEventListener("click", toggleLoginForm);
dom.logoutBtn.addEventListener("click", handleLogout);
initViewToggle();

window.addEventListener("beforeunload", () => {
  unsubscribeBookings && unsubscribeBookings();
  stopViewChangeListener && stopViewChangeListener();
  calendar.destroy();
});

updateAuthUI();

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearMessage(dom.loginMessage);

  const email = dom.loginEmailInput.value.trim();
  if (!email) {
    setMessage(dom.loginMessage, "Bitte geben Sie eine E-Mail-Adresse ein.", "error");
    return;
  }

  try {
    await authService.sendMagicLink(email);
    setMessage(dom.loginMessage, "Login-Link gesendet. Bitte E-Mail-Postfach prüfen.", "success");
    dom.loginForm.classList.add("hidden");
  } catch (error) {
    console.error("Login-Link konnte nicht gesendet werden", error);
    setMessage(dom.loginMessage, formatFirebaseError(error), "error");
  }
}

async function handleLogout() {
  clearMessage(dom.loginMessage);
  try {
    await authService.signOut();
    setMessage(dom.loginMessage, "Sie haben sich abgemeldet.", "success");
  } catch (error) {
    console.error("Abmelden fehlgeschlagen", error);
    setMessage(dom.loginMessage, formatFirebaseError(error), "error");
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  clearMessage(dom.formMessage);

  if (!state.user) {
    setMessage(dom.formMessage, "Bitte melden Sie sich an, bevor Sie eine Buchung speichern.", "error");
    return;
  }

  const formData = new FormData(dom.bookingForm);
  const name = (formData.get("name") || "").trim();
  const email = (formData.get("email") || "").trim().toLowerCase();
  const from = parseDate(formData.get("from"));
  const to = parseDate(formData.get("to"));
  const note = (formData.get("note") || "").trim();
  const honeypotValue = (formData.get("homepage") || "").trim();

  if (!name || !email || !from || !to) {
    setMessage(dom.formMessage, "Bitte füllen Sie alle Pflichtfelder aus.", "error");
    return;
  }

  if (!validateHoneypot(honeypotValue)) {
    setMessage(dom.formMessage, "Sicherheitsprüfung fehlgeschlagen.", "error");
    return;
  }

  if (from > to) {
    setMessage(dom.formMessage, "Das Abreisedatum darf nicht vor der Anreise liegen.", "error");
    return;
  }

  if (hasConflict(from, to)) {
    setMessage(dom.formMessage, "Der Zeitraum überschneidet sich mit einer bestehenden Buchung.", "error");
    return;
  }

  const rateCheck = rateLimiter.canAttempt(email || state.user.email);
  if (!rateCheck.allowed) {
    const minutes = Math.ceil((rateCheck.retryIn || 0) / 60000);
    setMessage(dom.formMessage, `Zu viele Buchungen. Bitte versuchen Sie es in ${minutes} Minute(n) erneut.`, "error");
    return;
  }

  dom.submitButton.disabled = true;
  dom.submitButton.textContent = "Wird gesendet...";

  try {
    await waitForMinimumDelay(3000);
    await dataService.createBooking({
      name,
      email,
      from,
      to,
      note,
      ownerEmail: state.user.email
    });
    rateLimiter.recordAttempt(email || state.user.email);
    dom.bookingForm.reset();
    syncFormEmail();
    setMessage(dom.formMessage, "Buchung gespeichert. Vielen Dank!", "success");
  } catch (error) {
    console.error("Buchung konnte nicht erstellt werden", error);
    setMessage(dom.formMessage, formatFirebaseError(error), "error");
  } finally {
    dom.submitButton.disabled = false;
    dom.submitButton.textContent = "Buchung speichern";
  }
}

async function handleDeleteBooking(bookingId) {
  if (!state.isOwner) {
    setMessage(dom.formMessage, "Nur Besitzer können Buchungen löschen.", "error");
    return;
  }
  try {
    await dataService.deleteBooking(bookingId);
    setMessage(dom.formMessage, "Buchung gelöscht.", "success");
  } catch (error) {
    console.error("Buchung konnte nicht gelöscht werden", error);
    setMessage(dom.formMessage, formatFirebaseError(error), "error");
  }
}

function toggleLoginForm() {
  if (dom.loginForm.classList.contains("hidden")) {
    dom.loginForm.classList.remove("hidden");
    dom.loginEmailInput.focus();
  } else {
    dom.loginForm.classList.add("hidden");
  }
}

function handleCalendarViewChange(viewName) {
  if (viewName === "dayGridMonth") {
    lastMonthAnchor = calendar.getDate();
  }
  if (Array.isArray(dom.viewToggleButtons)) {
    dom.viewToggleButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewName);
    });
  }
}

function initViewToggle() {
  if (!Array.isArray(dom.viewToggleButtons) || dom.viewToggleButtons.length === 0) {
    return;
  }
  dom.viewToggleButtons.forEach((button) => {
    button.addEventListener("click", () => handleViewToggle(button));
  });
  handleCalendarViewChange(calendar.getViewName());
}

function handleViewToggle(button) {
  if (!button) {
    return;
  }
  const targetView = button.dataset.view;
  if (!targetView || targetView === calendar.getViewName()) {
    return;
  }
  if (targetView === "multiMonthYear") {
    lastMonthAnchor = calendar.getDate();
    const january = new Date(lastMonthAnchor.getFullYear(), 0, 1);
    calendar.changeView("multiMonthYear", january);
    return;
  }
  const currentFocus = calendar.getDate();
  const hasAnchor = lastMonthAnchor instanceof Date && !Number.isNaN(lastMonthAnchor.getTime());
  const monthIndex = hasAnchor ? lastMonthAnchor.getMonth() : currentFocus.getMonth();
  const anchor = new Date(currentFocus.getFullYear(), monthIndex, 1);
  calendar.changeView(targetView, anchor);
}

function updateAuthUI() {
  const emailText = state.user && state.user.email ? state.user.email : "Nicht angemeldet";
  dom.userEmail.textContent = emailText;

  dom.logoutBtn.classList.toggle("hidden", !state.user);
  dom.loginToggleBtn.textContent = state.user ? "Login-Link erneut senden" : "Anmelden";

  if (state.user) {
    dom.loginForm.classList.add("hidden");
    dom.loginEmailInput.value = state.user.email;
  } else {
    dom.loginEmailInput.value = "";
  }

  calendar.setOwnerChecker(() => state.isOwner);
  syncFormEmail();
}

function syncFormEmail() {
  if (!dom.formEmailInput) {
    return;
  }
  if (state.user && state.user.email) {
    dom.formEmailInput.value = state.user.email;
    dom.formEmailInput.readOnly = true;
  } else {
    dom.formEmailInput.value = "";
    dom.formEmailInput.readOnly = false;
  }
}

function hasConflict(newStart, newEnd) {
  return state.bookings.some((booking) => {
    if (!booking.from || !booking.to) {
      return false;
    }
    const start = stripTime(booking.from);
    const end = stripTime(booking.to);
    return newStart <= end && newEnd >= start;
  });
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function setMessage(element, text, type) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.classList.remove("is-success", "is-error");
  if (type === "success") {
    element.classList.add("is-success");
  }
  if (type === "error") {
    element.classList.add("is-error");
  }
}

function clearMessage(element) {
  if (!element) {
    return;
  }
  element.textContent = "";
  element.classList.remove("is-success", "is-error");
}

function formatFirebaseError(error) {
  if (!error) {
    return "Unbekannter Fehler";
  }
  if (typeof error.message === "string") {
    return error.message;
  }
  return "Aktion fehlgeschlagen. Bitte später erneut versuchen.";
}
