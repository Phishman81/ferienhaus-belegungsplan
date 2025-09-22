const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function createCalendar(container, options = {}) {
  if (!container) {
    throw new Error("Kalender-Container fehlt");
  }

  const fullCalendarGlobal = window.FullCalendar || globalThis.FullCalendar;
  if (!fullCalendarGlobal || typeof fullCalendarGlobal.Calendar !== "function") {
    throw new Error("FullCalendar ist nicht geladen");
  }

  let deleteHandler = options.onDelete || (() => {});
  let ownerCheck = options.isOwnerChecker || (() => false);
  let tooltipEl = null;
  let lastEventEl = null;
  const viewListeners = new Set();

  const calendar = new fullCalendarGlobal.Calendar(container, {
    initialView: "dayGridMonth",
    locale: "de",
    firstDay: 1,
    height: "auto",
    buttonText: {
      today: "Heute"
    },
    dayMaxEvents: true,
    views: {
      multiMonthYear: {
        type: "multiMonth",
        duration: { years: 1 },
        multiMonthMaxColumns: 4,
        multiMonthMinWidth: 120
      }
    },
    eventClick(info) {
      info.jsEvent.preventDefault();
      if (ownerCheck()) {
        const confirmed = window.confirm("M&ouml;chten Sie diese Buchung l&ouml;schen?");
        if (confirmed) {
          deleteHandler(info.event.id);
        }
      } else {
        showTooltip(info);
      }
    },
    eventMouseEnter(info) {
      showTooltip(info);
    },
    eventMouseLeave() {
      hideTooltip();
    }
  });

  calendar.render();

  calendar.on("datesSet", (info) => {
    viewListeners.forEach((listener) => {
      try {
        listener(info.view.type, info);
      } catch (error) {
        console.error("Kalender-Listener Fehler", error);
      }
    });
  });

  function showTooltip(info) {
    hideTooltip();

    const template = document.getElementById("tooltip-template");
    if (!template) {
      return;
    }

    const event = info.event;
    const tooltipContent = template.content.firstElementChild.cloneNode(true);
    tooltipContent.querySelector(".tooltip-name").textContent = event.title || "Unbenannte Buchung";

    const fromDate = event.extendedProps.from || event.start;
    const toDate = event.extendedProps.to || event.end;
    tooltipContent.querySelector(".tooltip-dates").textContent = formatRange(fromDate, toDate);

    const noteEl = tooltipContent.querySelector(".tooltip-note");
    const note = (event.extendedProps.note || "").trim();
    if (note) {
      noteEl.textContent = note;
    } else {
      noteEl.textContent = "Keine Notiz";
      noteEl.classList.add("is-empty");
    }

    const deleteBtn = tooltipContent.querySelector(".tooltip-delete");
    if (deleteBtn) {
      if (ownerCheck()) {
        deleteBtn.classList.remove("hidden");
        deleteBtn.addEventListener("click", () => {
          hideTooltip();
          deleteHandler(event.id);
        });
      } else {
        deleteBtn.classList.add("hidden");
      }
    }

    tooltipEl = tooltipContent;
    document.body.appendChild(tooltipEl);
    positionTooltip(info.el, tooltipEl);
    lastEventEl = info.el;

    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", handleResize, { once: true });
  }

  function handleResize() {
    if (tooltipEl && lastEventEl) {
      positionTooltip(lastEventEl, tooltipEl);
    }
  }

  function hideTooltip() {
    if (tooltipEl && tooltipEl.parentElement) {
      tooltipEl.parentElement.removeChild(tooltipEl);
    }
    tooltipEl = null;
    lastEventEl = null;
    window.removeEventListener("scroll", hideTooltip, true);
  }

  function positionTooltip(targetEl, tipEl) {
    const rect = targetEl.getBoundingClientRect();
    const tipRect = tipEl.getBoundingClientRect();
    const top = rect.top + window.scrollY - tipRect.height - 8;
    const left = rect.left + window.scrollX + rect.width / 2 - tipRect.width / 2;

    tipEl.style.top = `${Math.max(window.scrollY + 10, top)}px`;
    tipEl.style.left = `${Math.max(10, Math.min(left, window.scrollX + window.innerWidth - tipRect.width - 10))}px`;
  }

  function update(bookings = []) {
    const events = bookings
      .filter((booking) => booking.from && booking.to)
      .map((booking) => convertBookingToEvent(booking));

    calendar.removeAllEvents();
    calendar.addEventSource(events);
  }

  function destroy() {
    hideTooltip();
    viewListeners.clear();
    calendar.destroy();
  }

  function setDeleteHandler(handler) {
    deleteHandler = handler || (() => {});
  }

  function setOwnerChecker(fn) {
    ownerCheck = fn || (() => false);
  }

  function changeView(viewName, date) {
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      calendar.changeView(viewName, date);
    } else {
      calendar.changeView(viewName);
    }
  }

  function getViewName() {
    return calendar.view ? calendar.view.type : "dayGridMonth";
  }

  function getDate() {
    return calendar.getDate();
  }

  function gotoDate(date) {
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      calendar.gotoDate(date);
    }
  }

  function onViewChange(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    viewListeners.add(listener);
    if (calendar.view) {
      try {
        listener(calendar.view.type, { view: calendar.view });
      } catch (error) {
        console.error("Kalender-Listener Fehler", error);
      }
    }
    return () => viewListeners.delete(listener);
  }

  return {
    update,
    destroy,
    setDeleteHandler,
    setOwnerChecker,
    changeView,
    getViewName,
    getDate,
    gotoDate,
    onViewChange
  };
}

function convertBookingToEvent(booking) {
  const start = normaliseDate(booking.from);
  const end = normaliseDate(booking.to);
  const exclusiveEnd = new Date(end.getTime() + DAY_IN_MS);

  return {
    id: booking.id,
    title: booking.name,
    start,
    end: exclusiveEnd,
    allDay: true,
    display: "block",
    backgroundColor: "#c53030",
    borderColor: "#c53030",
    extendedProps: {
      email: booking.email,
      note: booking.note,
      from: start,
      to: end
    }
  };
}

function normaliseDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map((part) => parseInt(part, 10));
    return new Date(year, month - 1, day);
  }
  return new Date();
}

function formatRange(from, toInclusive) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const start = from instanceof Date ? from : new Date(from);
  let end = toInclusive instanceof Date ? toInclusive : new Date(toInclusive);

  if (end.getTime() - start.getTime() < 0) {
    end = start;
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
