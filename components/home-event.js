import { events, eventDate, eventLink } from "./events.js";

const container = document.querySelector("#current-event");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const nextEvent = events
  .filter((event) => event.date >= today && !["Completed", "Canceled"].includes(event.status))
  .sort((first, second) => first.date.localeCompare(second.date))[0];

if (container && nextEvent) {
  const dateLabel = nextEvent.date === today
    ? "Today"
    : eventDate(nextEvent).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  container.innerHTML = `<p class="current-event__eyebrow">Next upcoming event · ${dateLabel}</p><h2 id="current-event-title"><a href="${eventLink(nextEvent)}">${nextEvent.title}</a></h2>${nextEvent.subtitle ? `<p class="current-event__subtitle">${nextEvent.subtitle}</p>` : ""}<p>${nextEvent.description}</p><dl class="current-event__details"><div><dt>Date</dt><dd><time datetime="${nextEvent.date}">${eventDate(nextEvent).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></dd></div><div><dt>Time</dt><dd>${nextEvent.time || "To be announced"}</dd></div><div><dt>Location</dt><dd>${nextEvent.location || "To be announced"}</dd></div></dl>`;
} else if (container) {
  container.innerHTML = '<p class="current-event__eyebrow">Next upcoming event</p><h2 id="current-event-title">No upcoming events listed</h2><p>Check the semester calendar for updates.</p><a href="calendar.html">View semester calendar</a>';
}