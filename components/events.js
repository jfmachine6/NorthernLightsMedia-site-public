export const semester = { name: "Fall 2026", year: 2026, months: [8, 9, 10, 11] };
const standardClubMeeting = { time: "6:15 PM - 7:30 PM", location: "Griffin Hall 231 (The DFX Lab)", isClubMeeting: true };

export const events = [
  { id: "3d-pictionary", date: "2026-09-24", title: "3D Pictionary / Gartic", status: "Completed", description: "Play 3D sculpting and modeling Pictionary and Gartic with Northern Lights Media.", ...standardClubMeeting },
  { id: "ember-film-festival", date: "2026-10-01", title: "EMBer Film Festival", status: "Completed", description: "Northern Lights Media attends the EMBer Film Festival together during our regular club meeting time.", time: "5:30 PM - 9:00 PM", location: "Griffin Hall Digitorium" },
  { id: "bob-ross-night", date: "2026-10-08", title: "Bob Ross Night", status: "Ready", description: "Follow along with a Bob Ross video in your software of choice. Led by Sadie, with some snacks provided.", ...standardClubMeeting },
  { id: "emb-professor-film-screening", date: "2026-10-09", title: "EMB Professor Film Screening", status: "Ready", description: "A film produced by EMB professors is being screened in the Digitorium.", location: "Griffin Hall Digitorium" },
  { id: "tutoring-night", date: "2026-10-15", title: "Tutoring Night", status: "Ready", description: "Bring your projects and get help before the big deadline.", ...standardClubMeeting },
  { id: "digital-pumpkin-carving", date: "2026-10-22", title: "Digital Pumpkin Carving & Halloween Modeling", status: "Planned", description: "Join Sadie for digital pumpkin carving using a prepared pumpkin model, with sculpting and modeling guidance available. You can also create your own Halloween-themed model. Suitable creations can be 3D printed at the campus Stego Lab with Sadie's help.", ...standardClubMeeting },
  { id: "halloween-awards", date: "2026-10-29", title: "The Monster Mesh", calendarTitle: "The Monster Mesh: Awards and Game Night", subtitle: "Northern Lights Media Halloween DFX Contest", status: "Planned", description: "Celebrate The Monster Mesh award recipients and see the submissions, then settle in for a relaxed game and movie night.", ...standardClubMeeting, time: "6:15 PM - 9:00 PM" },
  { id: "animated-film-interest", date: "2026-11-05", title: "Animated Short Film Interest Meeting", status: "Planned", description: "Learn about an animated short film project planned for production in the spring semester. Hear the rough schedule and apply to join the production team. Return on December 3 to pitch your film ideas.", ...standardClubMeeting },
  { id: "guest-lecture", date: "2026-11-12", title: "Guest Lecture", status: "Planned", description: "A guest lecture featuring a speaker from the DFX industry. Speaker details will be announced.", ...standardClubMeeting },
  { id: "portfolio-review", date: "2026-11-19", title: "DFX Portfolio Review Night", status: "Planned", description: "Showcase your DFX portfolio and receive feedback from the community.", ...standardClubMeeting },
  { id: "thanksgiving", date: "2026-11-26", title: "Thanksgiving Week - No Meeting", status: "Canceled", description: "No club meeting this week. The university is closed for the holiday." },
  { id: "animated-film-pitch", date: "2026-12-03", title: "Animated Short Film Pitch Night", status: "Planned", description: "Pitch your animated film ideas for the spring animated film project.", ...standardClubMeeting },
  { id: "finals-tutoring", date: "2026-12-10", title: "Finals Help / Tutoring Night", status: "Planned", description: "Bring your projects and get help before the final deadline.", ...standardClubMeeting },
];

export function eventDate(event) {
  return new Date(`${event.date}T12:00:00`);
}

export function statusLabel(event) {
  return event.status === "Ready" ? "Scheduled" : event.status === "Canceled" ? "No meeting" : event.status;
}

export function eventLink(event) {
  if (event.id === "halloween-awards") return "monster-mesh.html";
  return `event.html?id=${encodeURIComponent(event.id)}`;
}