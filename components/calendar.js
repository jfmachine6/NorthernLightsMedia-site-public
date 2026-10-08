import { semester, events, eventDate, statusLabel, eventLink } from "./events.js";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const calendar = document.querySelector("#semester-calendar");
const agenda = document.querySelector("#semester-agenda");

function eventBadge(event) {
  return `<span class="event-status event-status--${event.status.toLowerCase()}">${statusLabel(event)}</span>`;
}

if (calendar) {
  calendar.innerHTML = semester.months.map((month) => {
    const firstDay = new Date(semester.year, month, 1);
    const monthName = firstDay.toLocaleDateString("en-US", { month: "long" });
    const days = new Date(semester.year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDay.getDay() }, () => '<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
    for (let day = 1; day <= days; day += 1) {
      const date = `${semester.year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = events.filter((event) => event.date === date);
      cells.push(`<div class="calendar-day${date === today ? " calendar-day--today" : ""}"><time datetime="${date}" aria-label="${monthName} ${day}, ${semester.year}${date === today ? ", today" : ""}"${date === today ? ' aria-current="date"' : ""}>${day}</time>${dayEvents.map((event) => `<a class="calendar-event" href="${eventLink(event)}">${eventBadge(event)}<span>${event.calendarTitle || event.title}</span></a>`).join("")}</div>`);
    }
    while (cells.length < 42) cells.push('<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
    return `<section class="calendar-month" aria-labelledby="month-${month}"><h2 id="month-${month}">${monthName} <span>${semester.year}</span></h2><div class="calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div></section>`;
  }).join("");

  agenda.innerHTML = semester.months.map((month) => {
    const monthEvents = events.filter((event) => eventDate(event).getMonth() === month);
    const monthName = new Date(semester.year, month, 1).toLocaleDateString("en-US", { month: "long" });
    return `<section class="agenda-month"><h2>${monthName}</h2>${monthEvents.map((event) => `<a class="agenda-event" href="${eventLink(event)}"><time datetime="${event.date}">${eventDate(event).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time><div><h3>${event.calendarTitle || event.title}</h3><p>${event.status === "Canceled" ? "University closed for the holiday" : `${event.time || "Time to be announced"} / ${event.location || "Location to be announced"}`}</p></div>${eventBadge(event)}</a>`).join("")}</section>`;
  }).join("");

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const calendarView = button.dataset.view === "calendar";
      calendar.hidden = !calendarView;
      agenda.hidden = calendarView;
      document.querySelectorAll("[data-view]").forEach((control) => control.setAttribute("aria-pressed", String(control === button)));
    });
  });
}

const detail = document.querySelector("#event-detail");
if (detail) {
  const event = events.find((item) => item.id === new URLSearchParams(window.location.search).get("id"));
  if (event) {
    document.title = `${event.title} | Northern Lights Media`;
    document.querySelector('meta[name="description"]').content = event.description;
    detail.innerHTML = `<header><p class="events-eyebrow">${semester.name} / Northern Lights Media</p>${eventBadge(event)}<h1 id="event-title">${event.title}</h1>${event.subtitle ? `<p class="event-detail__subtitle">${event.subtitle}</p>` : ""}</header><div class="event-detail__body"><div><h2>About the event</h2><p>${event.description}</p>${event.status === "Planned" ? '<p class="events-note">This event is planned. Details may change.</p>' : ""}</div><dl class="event-facts"><div><dt>Date</dt><dd><time datetime="${event.date}">${longDate.format(eventDate(event))}</time></dd></div><div><dt>Time</dt><dd>${event.status === "Canceled" ? "No meeting" : event.time || "To be announced"}</dd></div><div><dt>Location</dt><dd>${event.status === "Canceled" ? "Not applicable" : event.location || "To be announced"}</dd></div></dl></div>`;
  } else {
    detail.innerHTML = '<h1 id="event-title">Event not found</h1><p>This event is not on the current semester calendar.</p><a class="calendar-back" href="calendar.html">Browse semester events &rarr;</a>';
  }
}