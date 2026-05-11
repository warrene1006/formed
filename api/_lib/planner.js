const MS_PER_DAY = 24 * 60 * 60 * 1000;

const events = [
  {
    name: "K-Town on the River 70.3",
    date: "2026-08-01",
    type: "70.3 triathlon",
    location: "Knoxville",
    distance: "1.2 swim / 56 bike / 13.1 run",
    priority: "A"
  },
  {
    name: "Road Bourbon Chase Ragnar",
    date: "2026-10-02",
    endDate: "2026-10-03",
    type: "Relay run",
    location: "Kentucky",
    distance: "Relay legs",
    priority: "B"
  }
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getWeekStart(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function daysBetween(start, end) {
  const a = parseDate(dateKey(start));
  const b = parseDate(typeof end === "string" ? end : dateKey(end));
  return Math.ceil((b - a) / MS_PER_DAY);
}

function minutesFromClock(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function setClock(date, totalMinutes) {
  const next = new Date(date);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

function summarizeActivities(activities = []) {
  const runs = activities.filter((activity) => {
    const type = `${activity.type || ""} ${activity.sport_type || ""}`.toLowerCase();
    return type.includes("run");
  });
  const now = new Date();
  const fourWeeksAgo = addDays(now, -28);
  const recentRuns = runs.filter((activity) => new Date(activity.start_date) >= fourWeeksAgo);
  const miles = (meters) => meters / 1609.344;
  const totalMiles = recentRuns.reduce((sum, activity) => sum + miles(Number(activity.distance_meters || activity.distance || 0)), 0);
  const heartRates = recentRuns.map((activity) => Number(activity.average_heartrate)).filter(Boolean);
  return {
    last4RunMiles: Math.round(totalMiles * 100) / 100,
    avgRecentHr: heartRates.length
      ? Math.round(heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length)
      : null,
    completedCount: activities.length
  };
}

function currentPhase(date) {
  const triDays = daysBetween(date, events[0].date);
  const ragnarDays = daysBetween(date, events[1].date);

  if (date < parseDate("2026-05-18")) return "run-restart";
  if (date < parseDate("2026-05-25")) return "travel";
  if (triDays >= 42) return "tri-base";
  if (triDays >= 14) return "tri-specific";
  if (triDays >= 0) return "tri-taper";
  if (date <= parseDate("2026-08-09")) return "post-tri-recovery";
  if (ragnarDays >= 14) return "ragnar-build";
  if (ragnarDays >= 0) return "ragnar-taper";
  return "maintenance";
}

function workout(sport, title, duration, intent, intensity = "low", priority = "support") {
  return { sport, title, duration, intent, intensity, priority };
}

function templatesForPhase(key) {
  const templates = {
    "run-restart": [
      workout("rest", "Mobility reset", 20, "Hips, calves, T-spine, easy walk."),
      workout("run", "Easy run", 35, "Conversational. Add 4 x 20s strides only if HR is calm.", "low", "key"),
      workout("strength", "Foundation A at Amped", 35, "Moderate loads, no grinding reps."),
      workout("run", "Easy run", 30, "Flat route or treadmill. Keep this truly easy."),
      workout("recovery", "Walk + mobility", 25, "Keep blood moving and leave room for life."),
      workout("run", "Long easy run", 45, "Cap effort. This is durability, not a test.", "low", "key"),
      workout("run", "Recovery run", 25, "Optional if legs feel good; walk if not.")
    ],
    travel: [
      workout("run", "Easy run", 30, "Simple out-and-back, no workout heroics.", "low", "key"),
      workout("recovery", "Steps + mobility", 25, "Disney walking counts. Add 10 minutes of calves and hips."),
      workout("run", "Cruise run", 35, "Comfortable rhythm. Stop early if sleep is poor."),
      workout("strength", "Travel strength", 25, "Bodyweight circuit, 2-3 relaxed rounds."),
      workout("run", "Short run + strides", 30, "Easy with 4 relaxed pickups if fresh."),
      workout("rest", "Travel buffer", 0, "Protect the day if logistics get weird."),
      workout("recovery", "Return reset", 20, "Walk, mobility, hydration, early bedtime.")
    ],
    "tri-base": [
      workout("rest", "Recovery + mobility", 25, "Soft tissue, hips, calves, shoulders."),
      workout("run", "Aerobic run", 45, "Easy with 6 relaxed strides."),
      workout("swim", "Swim technique", 45, "Drills, smooth 100s, relaxed breathing."),
      workout("bike", "Endurance ride", 60, "Zone 2 spin. Stay patient after the tune-up.", "low", "key"),
      workout("strength", "Foundation B at Amped", 40, "Single-leg strength, posterior chain, core."),
      workout("bike", "Long ride + brick", 100, "Mostly easy. Add 10-minute jog if readiness is green.", "low", "key"),
      workout("run", "Long easy run", 60, "Build gradually; keep HR controlled.", "low", "key")
    ],
    "tri-specific": [
      workout("rest", "Recovery + mobility", 25, "Downshift after the weekend."),
      workout("bike", "Bike tempo + brick", 80, "Main set controlled. 10-15 minute easy brick.", "moderate", "key"),
      workout("swim", "Endurance swim", 55, "Steady 200s/300s, relaxed form."),
      workout("run", "Tempo run", 55, "Warm up, 2 x 10 minutes comfortably hard, cool down.", "moderate", "key"),
      workout("strength", "Strength maintenance", 30, "Lower volume, crisp movement."),
      workout("bike", "Long ride + race fueling", 180, "70.3 fueling rehearsal with short brick.", "low", "key"),
      workout("run", "Long run", 85, "Easy-to-steady. No chasing pace.", "low", "key")
    ],
    maintenance: [
      workout("rest", "Recovery + mobility", 25, "Easy maintenance work."),
      workout("run", "Aerobic run", 45, "Conversational pace."),
      workout("strength", "Foundation A at Amped", 40, "Full-body strength."),
      workout("bike", "Aerobic ride", 60, "Zone 2 or indoor trainer."),
      workout("swim", "Technique swim", 40, "Relaxed form work."),
      workout("run", "Long run or hike", 65, "Easy durability."),
      workout("strength", "Foundation B at Amped", 35, "Moderate full-body lift.")
    ]
  };
  return templates[key] || templates.maintenance;
}

function readinessFromBaseline(baseline) {
  let score = 78;
  if ((baseline.avgRecentHr || 0) >= 175) score -= 8;
  if ((baseline.last4RunMiles || 0) < 12) score -= 4;
  return score >= 75 ? "green" : score >= 55 ? "amber" : "red";
}

function adjustWorkout(base, readiness) {
  const item = { ...base, notes: [] };
  if (readiness === "amber" && item.duration > 0) {
    item.duration = Math.max(20, Math.round(item.duration * 0.75 / 5) * 5);
    if (item.intensity === "moderate") item.intensity = "low";
    item.notes.push("Reduced because recent training load suggests caution.");
  }
  if (readiness === "red" && item.sport !== "rest") {
    return {
      sport: "recovery",
      title: "Recovery replacement",
      duration: 25,
      intent: "Walk, mobility, hydration, and re-check tomorrow.",
      intensity: "low",
      priority: "support",
      notes: ["Recovery replacement triggered by readiness."]
    };
  }
  if (!item.notes.length) item.notes.push("As planned.");
  return item;
}

function generateWeek({ today = new Date(), activities = [] } = {}) {
  const baseline = summarizeActivities(activities);
  const readiness = readinessFromBaseline(baseline);
  const phase = currentPhase(today);
  const start = getWeekStart(today);
  return templatesForPhase(phase).map((base, index) => {
    const date = addDays(start, index);
    return {
      ...adjustWorkout(base, readiness),
      day: dayNames[date.getDay()],
      date,
      available: ["Sat", "Sun"].includes(dayNames[date.getDay()]) ? 105 : 80
    };
  });
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatIcsDate(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function formatIcsDateTime(date) {
  return `${formatIcsDate(date)}T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function formatIcsUtc(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function foldIcsLine(line) {
  const chunks = [];
  let remaining = line;
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function scheduledWindow(item, settings) {
  const duration = Math.max(15, item.duration || 30);
  const isWeekend = ["Sat", "Sun"].includes(item.day);
  const defaultStart = minutesFromClock(isWeekend ? settings.weekendStart : settings.weekdayStart);
  const doneBy = minutesFromClock(isWeekend ? settings.weekendDoneBy : settings.weekdayDoneBy);
  const startMinutes = Math.min(defaultStart, doneBy - duration);
  const start = setClock(item.date, Math.max(0, startMinutes));
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + duration);
  return { start, end };
}

function workoutEvent(item, settings) {
  if (!settings.publishRestDays && item.sport === "rest") return [];

  const uid = `${dateKey(item.date)}-${item.sport}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@formed-by-elias`;
  const description = [
    `${settings.appName} with ${settings.coachName}`,
    `Sport: ${item.sport}`,
    `Duration: ${item.duration ? `${item.duration} minutes` : "Rest day"}`,
    `Intensity: ${item.intensity}`,
    `Intent: ${item.intent}`,
    `Adjustment: ${item.notes.join(" ")}`
  ].join("\n");

  if (!item.duration && item.sport === "rest") {
    const end = addDays(item.date, 1);
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsUtc(new Date())}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(item.date)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(`Training: ${item.title}`)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "END:VEVENT"
    ];
  }

  const { start, end } = scheduledWindow(item, settings);
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;TZID=${settings.timezone}:${formatIcsDateTime(start)}`,
    `DTEND;TZID=${settings.timezone}:${formatIcsDateTime(end)}`,
    `SUMMARY:${escapeIcsText(`Training: ${item.title}`)}`,
    item.sport === "strength" ? "LOCATION:Amped Fitness" : null,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT"
  ].filter(Boolean);
}

function raceEvent(event, settings) {
  const start = parseDate(event.date);
  const end = event.endDate ? addDays(parseDate(event.endDate), 1) : addDays(start, 1);
  return [
    "BEGIN:VEVENT",
    `UID:${event.date}-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@formed-by-elias`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(start)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(`Race: ${event.name}`)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(`${settings.appName} race target\nType: ${event.type}\nDistance: ${event.distance}\nPriority: ${event.priority}`)}`,
    "END:VEVENT"
  ];
}

function buildCalendar({ settings, activities = [], today = new Date() }) {
  const week = generateWeek({ today, activities });
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Formed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${settings.calendarName}`,
    `X-WR-TIMEZONE:${settings.timezone}`,
    ...week.flatMap((item) => workoutEvent(item, settings)),
    ...events.flatMap((event) => raceEvent(event, settings)),
    "END:VCALENDAR"
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

module.exports = {
  buildCalendar,
  generateWeek,
  summarizeActivities
};
