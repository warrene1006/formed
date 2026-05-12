const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TODAY = "2026-05-11";
const APP_NAME = "Formed";
const DEFAULT_COACH_NAME = "Elias";
const TIMEZONE = "America/Chicago";
const DEPLOYED_APP_URL = "https://formed-amber.vercel.app";
const SYNC_TOKEN_KEY = "formedSyncToken";
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const FOCUS_SYNC_THROTTLE_MS = 5 * 60 * 1000;
const CALENDAR_DEFAULTS = {
  weekdayStart: "05:30",
  weekdayDoneBy: "07:00",
  weekendStart: "05:45",
  weekendDoneBy: "07:30"
};

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

const constraints = [
  {
    name: "Bike tune-up",
    start: "2026-05-11",
    end: "2026-05-24",
    bikeAvailable: false,
    travel: false
  },
  {
    name: "Disney travel",
    start: "2026-05-18",
    end: "2026-05-24",
    bikeAvailable: false,
    travel: true
  }
];

const seedBaseline = {
  source: "Garmin Activities (11).csv",
  activityCount: 20,
  runCount: 17,
  dateRange: "Feb 24-May 2, 2026",
  runMiles: 84.12,
  runHours: 13.01,
  last4RunMiles: 17.68,
  last4RunHours: 2.84,
  last8RunMiles: 28.12,
  last8RunHours: 4.4,
  avgRecentHr: 176,
  avgRecentTrainingEffect: 4.9,
  recentPeakWeek: 29.96,
  latestActivity: "May 11 strength, 1:02:05",
  sourceNote: "Run baseline is seeded from your Garmin CSV. Last session is seeded from your latest Garmin FIT strength file.",
  lastSession: {
    source: "Garmin FIT",
    date: "2026-05-11T12:20:20-05:00",
    title: "Strength",
    sport: "Strength training",
    durationSeconds: 3725,
    movingTimeSeconds: 3725,
    elapsedTimeSeconds: 3725,
    calories: 456,
    avgHr: 113,
    maxHr: 166,
    aerobicTe: 2.1,
    activeSets: 25,
    setRecords: 50,
    totalReps: 276,
    activeDurationSeconds: 959,
    restDurationSeconds: 2766,
    notes: "Decoded from Garmin FIT file 22846234707_ACTIVITY.fit."
  }
};

const availabilityDefaults = {
  Mon: 40,
  Tue: 45,
  Wed: 45,
  Thu: 45,
  Fri: 30,
  Sat: 65,
  Sun: 55
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mondayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const strengthMenu = [
  {
    title: "Foundation A",
    text: "Trap-bar or goblet squat, cable row, Romanian deadlift, half-kneeling press, calf raises, Pallof press."
  },
  {
    title: "Foundation B",
    text: "Split squat, lat pulldown, hip thrust, incline dumbbell press, hamstring curl, side plank."
  },
  {
    title: "Travel Minimum",
    text: "Step-ups, push-ups, single-leg RDL reach, suitcase carry, dead bug, mobility."
  }
];

let baseline = { ...seedBaseline };
let currentWeek = [];
let coachProfile = loadCoachProfile();
let coachMessages = loadCoachMessages();
let workoutOverrides = loadJson("formedWorkoutOverrides", {});
let completedWorkouts = new Set(loadJson("formedCompletedWorkouts", []));
let lastSession = loadInitialLastSession();
let nutrition = loadJson("formedNutrition", null);
let syncInFlight = false;
let lastAutoSyncAt = 0;

const els = {
  appBrand: document.querySelector("#appBrand"),
  coachQuickChat: document.querySelector("#coachQuickChat"),
  topCoachInput: document.querySelector("#topCoachInput"),
  todayInput: document.querySelector("#todayInput"),
  sleepInput: document.querySelector("#sleepInput"),
  hrvInput: document.querySelector("#hrvInput"),
  rhrInput: document.querySelector("#rhrInput"),
  sorenessInput: document.querySelector("#sorenessInput"),
  sorenessOutput: document.querySelector("#sorenessOutput"),
  lifeInput: document.querySelector("#lifeInput"),
  lifeOutput: document.querySelector("#lifeOutput"),
  illnessInput: document.querySelector("#illnessInput"),
  eventModeInput: document.querySelector("#eventModeInput"),
  readinessPill: document.querySelector("#readinessPill"),
  readinessScore: document.querySelector("#readinessScore"),
  phaseTitle: document.querySelector("#phaseTitle"),
  phasePill: document.querySelector("#phasePill"),
  phaseCopy: document.querySelector("#phaseCopy"),
  metricStrip: document.querySelector("#metricStrip"),
  availabilityGrid: document.querySelector("#availabilityGrid"),
  weekTitle: document.querySelector("#weekTitle"),
  weekGrid: document.querySelector("#weekGrid"),
  dailyCallout: document.querySelector("#dailyCallout"),
  miniActions: document.querySelector("#miniActions"),
  baselineGrid: document.querySelector("#baselineGrid"),
  lastSessionSource: document.querySelector("#lastSessionSource"),
  lastSessionBody: document.querySelector("#lastSessionBody"),
  nutritionSource: document.querySelector("#nutritionSource"),
  nutritionGrid: document.querySelector("#nutritionGrid"),
  nutritionNote: document.querySelector("#nutritionNote"),
  dataNote: document.querySelector("#dataNote"),
  syncStatus: document.querySelector("#syncStatus"),
  coachNameInput: document.querySelector("#coachNameInput"),
  saveCoachButton: document.querySelector("#saveCoachButton"),
  coachConversation: document.querySelector("#coachConversation"),
  planPromptInput: document.querySelector("#planPromptInput"),
  askCoachButton: document.querySelector("#askCoachButton"),
  completedWorkoutSelect: document.querySelector("#completedWorkoutSelect"),
  rpeInput: document.querySelector("#rpeInput"),
  rpeOutput: document.querySelector("#rpeOutput"),
  feelingInput: document.querySelector("#feelingInput"),
  feedbackNotesInput: document.querySelector("#feedbackNotesInput"),
  completeWorkoutButton: document.querySelector("#completeWorkoutButton"),
  feedbackResponse: document.querySelector("#feedbackResponse"),
  csvInput: document.querySelector("#csvInput"),
  exportButton: document.querySelector("#exportButton"),
  icalButton: document.querySelector("#icalButton"),
  resetAvailabilityButton: document.querySelector("#resetAvailabilityButton"),
  eventCountdown: document.querySelector("#eventCountdown"),
  strengthList: document.querySelector("#strengthList"),
  timeline: document.querySelector("#timeline")
};

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", options).format(value);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSyncToken({ prompt = false } = {}) {
  let token = localStorage.getItem(SYNC_TOKEN_KEY);
  if (!token && prompt) {
    token = window.prompt("Paste your private Formed sync token once so background sync can run.");
    if (token) localStorage.setItem(SYNC_TOKEN_KEY, token.trim());
  }
  return token;
}

function sessionTimestamp(session) {
  const timestamp = new Date(session?.date || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function loadInitialLastSession() {
  const stored = loadJson("formedLastSession", null);
  if (!stored) return seedBaseline.lastSession;
  return sessionTimestamp(seedBaseline.lastSession) > sessionTimestamp(stored)
    ? seedBaseline.lastSession
    : stored;
}

function apiUrl(path) {
  return location.protocol === "file:" ? `${DEPLOYED_APP_URL}${path}` : path;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function saveLastSession(session) {
  if (!session) return;
  lastSession = {
    updatedAt: new Date().toISOString(),
    ...session
  };
  saveJson("formedLastSession", lastSession);
}

function loadCoachProfile() {
  return loadJson("formedCoachProfile", { coachName: DEFAULT_COACH_NAME });
}

function saveCoachProfile() {
  coachProfile.coachName = (els.coachNameInput?.value || DEFAULT_COACH_NAME).trim() || DEFAULT_COACH_NAME;
  saveJson("formedCoachProfile", coachProfile);
  renderCoachIdentity();
  renderCoachConversation();
}

function loadCoachMessages() {
  const coachName = coachProfile?.coachName || DEFAULT_COACH_NAME;
  return loadJson("formedCoachMessages", [
    {
      role: "coach",
      text: `I’m ${coachName}. I’ll help shape the plan around the races, the work, the travel, and the dad/husband clock. Tell me what feels most important before we build the next block.`
    }
  ]);
}

function workoutId(item) {
  return `${dateKey(item.date)}-${item.sport}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function daysBetween(start, end) {
  const a = parseDate(dateKey(start));
  const b = parseDate(typeof end === "string" ? end : dateKey(end));
  return Math.ceil((b - a) / MS_PER_DAY);
}

function inRange(date, start, end) {
  const current = parseDate(dateKey(date));
  return current >= parseDate(start) && current <= parseDate(end);
}

function getWeekStart(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  return weekStart;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getAvailability() {
  const values = {};
  mondayOrder.forEach((day) => {
    const input = document.querySelector(`[data-availability="${day}"]`);
    values[day] = Number(input?.value ?? availabilityDefaults[day]);
  });
  return values;
}

function buildAvailabilityControls() {
  els.availabilityGrid.innerHTML = mondayOrder.map((day) => `
    <label class="day-slider">
      <span>${day}</span>
      <input data-availability="${day}" type="range" min="0" max="150" step="5" value="${availabilityDefaults[day]}">
      <output>${availabilityDefaults[day]}m</output>
    </label>
  `).join("");

  els.availabilityGrid.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      input.nextElementSibling.textContent = `${input.value}m`;
      render();
    });
  });
}

function getReadiness() {
  let score = 78;
  const sleep = els.sleepInput.value;
  const hrv = els.hrvInput.value;
  const rhr = els.rhrInput.value;
  const soreness = Number(els.sorenessInput.value);
  const life = Number(els.lifeInput.value);
  const recentTrainingEffect = baseline.avgRecentTrainingEffect ?? 0;

  if (sleep === "great") score += 8;
  if (sleep === "poor") score -= 18;
  if (hrv === "up") score += 7;
  if (hrv === "down") score -= 16;
  if (rhr === "plus4") score -= 10;
  if (rhr === "plus8") score -= 22;
  score -= Math.max(0, soreness - 2) * 3.8;
  score -= Math.max(0, life - 4) * 3.5;
  if (recentTrainingEffect >= 4.5) score -= 5;
  if (els.illnessInput.checked) score = Math.min(score, 34);
  score = Math.max(5, Math.min(100, Math.round(score)));

  const level = score >= 75 ? "green" : score >= 55 ? "amber" : "red";
  const label = level === "green" ? "Build" : level === "amber" ? "Adjust" : "Recover";
  return { score, level, label };
}

function currentConstraint(date) {
  return constraints.find((constraint) => inRange(date, constraint.start, constraint.end));
}

function getPhase(date) {
  const eventMode = els.eventModeInput.checked;
  const constraint = currentConstraint(date);
  const triDays = daysBetween(date, events[0].date);
  const ragnarDays = daysBetween(date, events[1].date);

  if (!eventMode) {
    return {
      key: "maintenance",
      title: "General maintenance",
      pill: "No event block",
      copy: "Balanced aerobic work, strength, and mobility. Volume moves with readiness and available time."
    };
  }

  if (constraint?.travel) {
    return {
      key: "travel",
      title: "Disney travel week",
      pill: "Travel",
      copy: "Short runs, steps, mobility, and bodyweight strength. Bike and formal swim stay off the critical path until you are back Sunday, May 24."
    };
  }

  if (date < parseDate("2026-05-18")) {
    return {
      key: "run-restart",
      title: "Run restart",
      pill: "Bike tune-up",
      copy: "Running can start now, but intensity stays controlled because recent Garmin runs show high heart-rate load. Bike work resumes after the tune-up window."
    };
  }

  if (date < parseDate("2026-05-25")) {
    return {
      key: "travel",
      title: "Disney travel week",
      pill: "Travel",
      copy: "Keep momentum with compact sessions and plenty of walking. The win is arriving home ready to train, not squeezing in hero work."
    };
  }

  if (triDays >= 42) {
    return {
      key: "tri-base",
      title: "70.3 base rebuild",
      pill: `${triDays} days`,
      copy: "Bike, swim, run, and strength return in a conservative build. Long aerobic durability matters more than sharp workouts right now."
    };
  }

  if (triDays >= 14) {
    return {
      key: "tri-specific",
      title: "70.3 race-specific",
      pill: `${triDays} days`,
      copy: "The week centers on long bike durability, brick practice, swim frequency, and a protected long run."
    };
  }

  if (triDays >= 0) {
    return {
      key: "tri-taper",
      title: "70.3 taper",
      pill: `${triDays} days`,
      copy: "Reduce fatigue while keeping rhythm. Sessions become shorter and cleaner with race-pace touches."
    };
  }

  if (date <= parseDate("2026-08-09")) {
    return {
      key: "post-tri-recovery",
      title: "Post-70.3 reset",
      pill: "Recovery",
      copy: "Restore legs and connective tissue before shifting into run durability for Bourbon Chase."
    };
  }

  if (ragnarDays >= 14) {
    return {
      key: "ragnar-build",
      title: "Bourbon Chase durability",
      pill: `${ragnarDays} days`,
      copy: "Run frequency, hills, and occasional split-day sessions prepare you for relay rhythm while strength protects the chassis."
    };
  }

  if (ragnarDays >= 0) {
    return {
      key: "ragnar-taper",
      title: "Bourbon Chase taper",
      pill: `${ragnarDays} days`,
      copy: "Keep legs springy and reduce fatigue. The final week is about freshness, logistics, and sleep."
    };
  }

  return {
    key: "maintenance",
    title: "General maintenance",
    pill: "Maintenance",
    copy: "Balanced aerobic work, strength, and mobility. New events can take over the plan whenever they appear."
  };
}

function templatesForPhase(key) {
  const templates = {
    "run-restart": [
      rest("Mobility reset", 20, "Hips, calves, T-spine, easy walk."),
      run("Easy run", 35, "Conversational. Add 4 x 20s strides only if HR is calm.", "low", "key"),
      strength("Foundation A at Amped", 35, "Moderate loads, no grinding reps.", "low"),
      run("Easy run", 30, "Flat route or treadmill. Keep this truly easy.", "low"),
      recovery("Walk + mobility", 25, "Keep blood moving and leave room for life."),
      run("Long easy run", 45, "Cap effort. This is durability, not a test.", "low", "key"),
      run("Recovery run", 25, "Optional if legs feel good; walk if not.", "low")
    ],
    travel: [
      run("Easy run", 30, "Simple out-and-back, no workout heroics.", "low", "key"),
      recovery("Steps + mobility", 25, "Disney walking counts. Add 10 minutes of calves and hips."),
      run("Cruise run", 35, "Comfortable rhythm. Stop early if sleep is poor.", "low"),
      strength("Travel strength", 25, "Bodyweight circuit, 2-3 relaxed rounds.", "low"),
      run("Short run + strides", 30, "Easy with 4 relaxed pickups if fresh.", "low"),
      rest("Travel buffer", 0, "Protect the day if logistics get weird."),
      recovery("Return reset", 20, "Walk, mobility, hydration, early bedtime.")
    ],
    "tri-base": [
      rest("Recovery + mobility", 25, "Soft tissue, hips, calves, shoulders."),
      run("Aerobic run", 45, "Easy with 6 relaxed strides.", "low"),
      swim("Swim technique", 45, "Drills, smooth 100s, relaxed breathing."),
      bike("Endurance ride", 60, "Zone 2 spin. Stay patient after the tune-up.", "low", "key"),
      strength("Foundation B at Amped", 40, "Single-leg strength, posterior chain, core."),
      bike("Long ride + brick", 100, "Mostly easy. Add 10-minute jog if readiness is green.", "low", "key"),
      run("Long easy run", 60, "Build gradually; keep HR controlled.", "low", "key")
    ],
    "tri-specific": [
      rest("Recovery + mobility", 25, "Downshift after the weekend."),
      bike("Bike tempo + brick", 80, "Main set controlled. 10-15 minute easy brick.", "moderate", "key"),
      swim("Endurance swim", 55, "Steady 200s/300s, relaxed form."),
      run("Tempo run", 55, "Warm up, 2 x 10 minutes comfortably hard, cool down.", "moderate", "key"),
      strength("Strength maintenance", 30, "Lower volume, crisp movement."),
      bike("Long ride + race fueling", 180, "70.3 fueling rehearsal with short brick.", "low", "key"),
      run("Long run", 85, "Easy-to-steady. No chasing pace.", "low", "key")
    ],
    "tri-taper": [
      rest("Recovery + mobility", 20, "Keep joints loose."),
      swim("Swim tune-up", 35, "Short, smooth, confident."),
      bike("Bike openers", 45, "A few race-pace efforts, lots of easy spinning."),
      run("Run openers", 35, "Short pickups, stop feeling sharp."),
      rest("Travel + prep", 20, "Gear, hydration, light mobility."),
      bike("Pre-race spin", 20, "Easy spin and a few 20s efforts."),
      rest("Race day or full rest", 0, "Execute the plan.")
    ],
    "post-tri-recovery": [
      rest("Full recovery", 0, "No obligation."),
      recovery("Walk + mobility", 20, "Gentle range of motion."),
      swim("Easy swim", 25, "Flush only."),
      recovery("Walk", 25, "Keep it comfortable."),
      strength("Mobility strength", 25, "Light core and activation."),
      bike("Easy spin", 35, "No metrics target."),
      run("Short easy jog", 25, "Only if legs are normal.")
    ],
    "ragnar-build": [
      rest("Recovery + mobility", 25, "Protect calves, feet, hips."),
      run("Hill run", 50, "Short hill reps or rolling route.", "moderate", "key"),
      strength("Foundation A at Amped", 40, "Keep posterior chain strong."),
      run("Easy run", 45, "Soft surface if possible.", "low"),
      run("Second-run primer", 30, "Easy evening shakeout or treadmill.", "low"),
      run("Long run", 90, "Durability pace; rolling terrain if available.", "low", "key"),
      bike("Recovery ride or swim", 45, "Low impact aerobic maintenance.")
    ],
    "ragnar-taper": [
      rest("Recovery + mobility", 20, "Light and easy."),
      run("Easy run + strides", 35, "Keep pop without fatigue."),
      strength("Activation", 25, "Bodyweight, bands, core."),
      run("Short run", 25, "Relaxed, stop fresh."),
      rest("Travel + logistics", 0, "Hydrate, pack, sleep."),
      run("Ragnar race", 0, "Run your assigned legs."),
      run("Ragnar race", 0, "Fuel, recover, repeat.")
    ],
    maintenance: [
      rest("Recovery + mobility", 25, "Easy maintenance work."),
      run("Aerobic run", 45, "Conversational pace."),
      strength("Foundation A at Amped", 40, "Full-body strength."),
      bike("Aerobic ride", 60, "Zone 2 or indoor trainer."),
      swim("Technique swim", 40, "Relaxed form work."),
      run("Long run or hike", 65, "Easy durability."),
      strength("Foundation B at Amped", 35, "Moderate full-body lift.")
    ]
  };
  return templates[key] ?? templates.maintenance;
}

function workout(sport, title, duration, intent, intensity = "low", priority = "support") {
  return { sport, title, duration, intent, intensity, priority };
}

function run(title, duration, intent, intensity, priority) {
  return workout("run", title, duration, intent, intensity, priority);
}

function bike(title, duration, intent, intensity, priority) {
  return workout("bike", title, duration, intent, intensity, priority);
}

function swim(title, duration, intent, intensity, priority) {
  return workout("swim", title, duration, intent, intensity, priority);
}

function strength(title, duration, intent, intensity = "low", priority = "support") {
  return workout("strength", title, duration, intent, intensity, priority);
}

function rest(title, duration, intent) {
  return workout("rest", title, duration, intent, "low", "support");
}

function recovery(title, duration, intent) {
  return workout("recovery", title, duration, intent, "low", "support");
}

function adaptWorkout(base, date, readiness, availableMinutes) {
  const constraint = currentConstraint(date);
  let adapted = { ...base };
  const notes = [];
  let className = "";

  if (constraint && adapted.sport === "bike" && constraint.bikeAvailable === false) {
    adapted = run("Bike substitute", Math.min(40, Math.max(25, availableMinutes)), "Easy run, walk, or gym bike only if available. Keep it low stress.", "low", base.priority);
    notes.push("Bike unavailable until after May 24.");
    className = "compressed";
  }

  if (constraint?.travel && !["run", "recovery", "rest", "strength"].includes(adapted.sport)) {
    adapted = recovery("Travel movement", Math.min(25, availableMinutes), "Walk and mobility.");
    notes.push("Travel mode keeps logistics light.");
    className = "compressed";
  }

  if (readiness.level === "red" && adapted.sport !== "rest") {
    adapted = adapted.priority === "key"
      ? recovery("Recovery replacement", Math.min(25, Math.max(15, availableMinutes)), "Walk, mobility, and hydration. Re-check tomorrow.")
      : rest("Rest", 0, "Let recovery win today.");
    notes.push("Readiness is red.");
    className = "recovery";
  } else if (readiness.level === "amber" && adapted.duration > 0) {
    adapted.duration = Math.max(20, Math.round(adapted.duration * 0.72 / 5) * 5);
    adapted.intensity = adapted.intensity === "moderate" ? "low" : adapted.intensity;
    notes.push("Reduced for amber readiness.");
    className = "compressed";
  }

  if (availableMinutes === 0 && adapted.sport !== "rest") {
    adapted = rest("Life buffer", 0, "No session scheduled.");
    notes.push("No training window set.");
    className = "recovery";
  } else if (adapted.duration > availableMinutes && adapted.sport !== "rest") {
    const minimum = adapted.priority === "key" ? 25 : 15;
    adapted.duration = Math.max(minimum, availableMinutes);
    notes.push("Compressed to fit the day.");
    className = className || "compressed";
  }

  return { ...adapted, notes, className };
}

function buildWeek(date, phase, readiness, availability) {
  const start = getWeekStart(date);
  const template = templatesForPhase(phase.key);
  return template.map((base, index) => {
    const dayDate = addDays(start, index);
    const day = dayNames[dayDate.getDay()];
    const available = availability[day] ?? 45;
    const adapted = adaptWorkout(base, dayDate, readiness, available);
    return {
      ...adapted,
      baseTitle: base.title,
      date: dayDate,
      day,
      available
    };
  });
}

function renderCountdown(today) {
  const future = events.filter((event) => daysBetween(today, event.date) >= 0);
  els.eventCountdown.innerHTML = future.slice(0, 2).map((event) => {
    const days = daysBetween(today, event.date);
    return `
      <div class="count-card">
        <strong>${days}</strong>
        <span>${event.name}</span>
      </div>
    `;
  }).join("");
}

function renderPhase(phase) {
  els.phaseTitle.textContent = phase.title;
  els.phasePill.textContent = phase.pill;
  els.phaseCopy.innerHTML = `<p>${phase.copy}</p>`;

  const metrics = [
    [`${Math.round((baseline.last4RunMiles ?? 0) / 4 * 10) / 10}`, "mi/wk, last 4 weeks"],
    [`${baseline.avgRecentHr ?? "--"}`, "avg HR, recent runs"],
    [`${baseline.avgRecentTrainingEffect ?? "--"}`, "avg aerobic TE"]
  ];
  els.metricStrip.innerHTML = metrics.map(([value, label]) => `
    <div class="metric">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `).join("");
}

function renderReadiness(readiness) {
  els.sorenessOutput.textContent = els.sorenessInput.value;
  els.lifeOutput.textContent = els.lifeInput.value;
  els.readinessPill.textContent = readiness.label;
  els.readinessPill.className = `status-pill ${readiness.level}`;
  els.readinessScore.textContent = readiness.score;
  els.readinessScore.className = `readiness-score ${readiness.level}`;
}

function renderDailyCallout(today, week, readiness, phase) {
  const todayWorkout = week.find((item) => dateKey(item.date) === dateKey(today)) ?? week[0];
  const colorClass = readiness.level === "green" ? "" : readiness.level;
  const headline = readiness.level === "green"
    ? "Proceed with the planned session."
    : readiness.level === "amber"
      ? "Keep the habit, trim the stress."
      : "Recovery is the workout.";

  els.dailyCallout.className = `callout ${colorClass}`;
  els.dailyCallout.innerHTML = `
    <strong>${headline}</strong>
    ${todayWorkout.title}: ${todayWorkout.duration ? `${todayWorkout.duration} minutes` : "no formal duration"}. ${todayWorkout.intent}
  `;

  const actions = [
    phase.key.includes("tri") ? "Fuel long rides early" : "Keep easy days easy",
    phase.key === "travel" ? "Count park steps" : "Log sleep and HRV",
    readiness.level === "red" ? "Skip intensity" : "Protect tomorrow",
    "Strength stays submax"
  ];
  els.miniActions.innerHTML = actions.map((action) => `<div class="mini-action">${action}</div>`).join("");
}

function renderWeek(today, week) {
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  els.weekTitle.textContent = `${formatDate(weekStart)}-${formatDate(weekEnd)}`;
  els.weekGrid.innerHTML = week.map((item) => {
    const todayClass = dateKey(item.date) === dateKey(today) ? " today" : "";
    const completedClass = completedWorkouts.has(workoutId(item)) ? " completed" : "";
    const extraClass = item.className ? ` ${item.className}` : "";
    const notes = item.notes.length ? item.notes.join(" ") : "As planned.";
    return `
      <article class="workout-card${todayClass}${completedClass}${extraClass}">
        <div>
          <div class="date">${item.day} ${formatDate(item.date)}</div>
          <span class="sport ${item.sport}">${item.sport}</span>
        </div>
        <h3>${item.title}</h3>
        <div class="details">
          <span>${item.duration ? `${item.duration} min` : "Rest day"}</span>
          <span>${item.intensity} intensity</span>
          <span>${item.intent}</span>
        </div>
        <div class="adaptation">
          <strong>${item.available} min available</strong>
          ${notes}
        </div>
      </article>
    `;
  }).join("");
}

function renderWorkoutSelect() {
  if (!els.completedWorkoutSelect) return;
  els.completedWorkoutSelect.innerHTML = currentWeek.map((item, index) => `
    <option value="${index}">${item.day} ${formatDate(item.date)} - ${item.title}</option>
  `).join("");
}

function applyWorkoutOverrides(week) {
  return week.map((item) => {
    const override = workoutOverrides[workoutId(item)];
    if (!override) return item;
    return {
      ...item,
      ...override,
      notes: [...(item.notes || []), ...(override.notes || [])],
      className: override.className || item.className
    };
  });
}

function formatSeconds(totalSeconds) {
  const seconds = Number(totalSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSessionDate(value) {
  if (!value) return "Date unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return `${formatDate(date, { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function compactNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number.toLocaleString("en-US", {
    maximumFractionDigits: digits
  });
}

function sessionMetricRows(session) {
  return [
    [session.sport, "type"],
    [session.distanceMiles != null ? `${compactNumber(session.distanceMiles, 2)} mi` : null, "distance"],
    [session.durationSeconds ? formatSeconds(session.durationSeconds) : session.durationMinutes ? `${session.durationMinutes} min` : null, "time"],
    [session.movingTimeSeconds ? formatSeconds(session.movingTimeSeconds) : null, "moving time"],
    [session.elapsedTimeSeconds ? formatSeconds(session.elapsedTimeSeconds) : null, "elapsed time"],
    [session.activeSets ? compactNumber(session.activeSets, 0) : null, "active sets"],
    [session.setRecords ? compactNumber(session.setRecords, 0) : null, "set records"],
    [session.totalReps ? compactNumber(session.totalReps, 0) : null, "reps"],
    [session.activeDurationSeconds ? formatSeconds(session.activeDurationSeconds) : null, "active time"],
    [session.restDurationSeconds ? formatSeconds(session.restDurationSeconds) : null, "rest time"],
    [session.avgPace ? `${session.avgPace}/mi` : null, "avg pace"],
    [session.bestPace ? `${session.bestPace}/mi` : null, "best pace"],
    [session.avgSpeedMph ? `${compactNumber(session.avgSpeedMph, 1)} mph` : null, "avg speed"],
    [session.avgHr ? `${Math.round(session.avgHr)} bpm` : null, "avg HR"],
    [session.maxHr ? `${Math.round(session.maxHr)} bpm` : null, "max HR"],
    [session.aerobicTe != null ? compactNumber(session.aerobicTe, 1) : null, "aerobic TE"],
    [session.calories ? compactNumber(session.calories, 0) : null, "calories"],
    [session.avgCadence ? `${Math.round(session.avgCadence)} spm` : null, "avg cadence"],
    [session.maxCadence ? `${Math.round(session.maxCadence)} spm` : null, "max cadence"],
    [session.steps ? compactNumber(session.steps, 0) : null, "steps"],
    [session.ascent ? `${compactNumber(session.ascent, 0)} ft` : null, "ascent"],
    [session.descent ? `${compactNumber(session.descent, 0)} ft` : null, "descent"],
    [session.strideLength ? `${compactNumber(session.strideLength, 2)} m` : null, "stride"],
    [session.avgWatts ? `${Math.round(session.avgWatts)} W` : null, "avg power"],
    [session.intensity, "planned intensity"],
    [session.available ? `${session.available} min` : null, "available"],
    [session.rpe ? `${session.rpe}/10` : null, "RPE"],
    [session.feeling, "feel"]
  ].filter(([value]) => value != null && value !== "");
}

function renderLastSession() {
  if (!els.lastSessionBody) return;
  const session = lastSession || seedBaseline.lastSession;
  if (!session) {
    els.lastSessionSource.textContent = "No data";
    els.lastSessionBody.innerHTML = `
      <div class="last-session-note">Import a Garmin CSV, sync Strava, or complete a Formed workout to fill this in.</div>
    `;
    return;
  }

  els.lastSessionSource.textContent = session.source || "Session";
  const notes = [session.intent, session.notes, session.adaptationNote].filter(Boolean).join(" ");
  els.lastSessionBody.innerHTML = `
    <div class="last-session-title">
      <strong>${escapeHtml(session.title || "Training session")}</strong>
      <span>${escapeHtml(formatSessionDate(session.date))}</span>
    </div>
    <div class="last-session-stats">
      ${sessionMetricRows(session).map(([value, label]) => `
        <div class="last-session-stat">
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `).join("")}
    </div>
    ${notes ? `<div class="last-session-note">${escapeHtml(notes)}</div>` : ""}
  `;
}

function renderBaseline() {
  const weeklyAverage = Math.round((baseline.last4RunMiles ?? 0) / 4 * 10) / 10;
  const metrics = [
    [baseline.runCount, "run activities"],
    [`${weeklyAverage}`, "mi/wk, last 4 weeks"],
    [`${baseline.recentPeakWeek ?? "--"}`, "recent peak week mi"],
    [`${baseline.avgRecentHr ?? "--"}`, "avg recent HR"],
    [`${baseline.avgRecentTrainingEffect ?? "--"}`, "avg aerobic TE"],
    [baseline.latestActivity ?? "No activity", "latest activity"]
  ];

  els.baselineGrid.innerHTML = metrics.map(([value, label]) => `
    <div class="metric">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `).join("");
  els.dataNote.textContent = baseline.sourceNote;
}

function nutritionCoachSummary() {
  if (!nutrition?.latestDate || !nutrition?.totals) return "";
  const totals = nutrition.totals;
  const calories = formatNutritionMetric(totals.calories, "");
  const protein = formatNutritionMetric(totals.protein, "g");
  const carbs = formatNutritionMetric(totals.carbs, "g");
  if (!calories && !protein && !carbs) return "";
  return `Latest MyFitnessPal day: ${[
    calories ? `${calories} calories` : null,
    protein ? `${protein} protein` : null,
    carbs ? `${carbs} carbs` : null
  ].filter(Boolean).join(", ")}.`;
}

function renderNutrition() {
  if (!els.nutritionGrid) return;
  if (!nutrition?.latestDate) {
    els.nutritionSource.textContent = "No import";
    els.nutritionGrid.innerHTML = `
      <div class="metric">
        <strong>--</strong>
        <span>nutrition CSV</span>
      </div>
      <div class="metric">
        <strong>--</strong>
        <span>protein</span>
      </div>
      <div class="metric">
        <strong>--</strong>
        <span>carbs</span>
      </div>
    `;
    els.nutritionNote.textContent = "Import a MyFitnessPal nutrition CSV to give Elias fueling context.";
    return;
  }

  const totals = nutrition.totals || {};
  const metrics = [
    [formatNutritionMetric(totals.calories, ""), "calories"],
    [formatNutritionMetric(totals.protein, "g"), "protein"],
    [formatNutritionMetric(totals.carbs, "g"), "carbs"],
    [formatNutritionMetric(totals.fat, "g"), "fat"],
    [formatNutritionMetric(totals.fiber, "g"), "fiber"],
    [formatNutritionMetric(totals.sodium, "mg"), "sodium"]
  ];

  els.nutritionSource.textContent = nutrition.source || "MFP CSV";
  els.nutritionGrid.innerHTML = metrics.map(([value, label]) => `
    <div class="metric">
      <strong>${escapeHtml(value || "--")}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
  els.nutritionNote.textContent = `${nutrition.dateLabel || nutrition.latestDate}: ${nutrition.entryCount || 0} entries across ${nutrition.mealCount || 0} meals. ${nutrition.readinessNote || ""}`.trim();
}

function renderCoachIdentity() {
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  document.title = APP_NAME;
  els.appBrand.textContent = APP_NAME;
  const quickChatLabel = document.querySelector("label[for='topCoachInput']");
  if (quickChatLabel) quickChatLabel.textContent = `Talk with ${coachName}`;
  if (els.topCoachInput) {
    els.topCoachInput.placeholder = `Ask ${coachName} about today, recovery, or schedule changes`;
  }
  els.coachNameInput.value = coachName;
  if (els.syncStatus && !els.syncStatus.dataset.touched) {
    els.syncStatus.textContent = `Background sync is standing by. Coach: ${coachName}.`;
  }
}

function renderCoachConversation() {
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  els.coachConversation.innerHTML = coachMessages.map((message) => `
    <div class="coach-message ${message.role === "user" ? "user" : "coach"}">
      <strong>${message.role === "user" ? "You" : coachName}</strong>
      ${message.text}
    </div>
  `).join("");
}

function renderStrengthMenu() {
  els.strengthList.innerHTML = strengthMenu.map((item) => `
    <article class="strength-item">
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    </article>
  `).join("");
}

function renderTimeline(today) {
  const items = [
    {
      date: "2026-05-11",
      title: "Run restart",
      text: "Bike tune-up window; strength can begin at Amped.",
      distance: "Now"
    },
    {
      date: "2026-05-18",
      title: "Disney travel",
      text: "Short sessions, walking load, mobility, no bike dependency.",
      distance: "May 18-24"
    },
    ...events.map((event) => ({
      date: event.date,
      title: event.name,
      text: `${event.type} in ${event.location}. Priority ${event.priority}.`,
      distance: event.distance
    })),
    {
      date: "2026-10-04",
      title: "Maintenance mode",
      text: "Balanced aerobic training and strength until the next event is added.",
      distance: "After"
    }
  ];

  els.timeline.innerHTML = items.map((item) => {
    const itemDate = parseDate(item.date);
    const days = daysBetween(today, item.date);
    const suffix = days >= 0 ? `${days} days` : "done";
    return `
      <article class="timeline-item">
        <div class="timeline-date">${formatDate(itemDate, { month: "short", day: "numeric" })}<br>${suffix}</div>
        <div>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </div>
        <div class="timeline-distance">${item.distance}</div>
      </article>
    `;
  }).join("");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function parseNumber(value) {
  if (!value || value === "--") return null;
  const number = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(number) ? number : null;
}

function parseNutritionNumber(value) {
  if (value == null || value === "" || value === "--") return null;
  const cleaned = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function formatNutritionMetric(value, unit) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const rounded = Math.round(Number(value) * 10) / 10;
  const compact = compactNumber(rounded, rounded % 1 === 0 ? 0 : 1);
  return unit ? `${compact}${unit}` : compact;
}

function normalizeCsvHeader(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function csvValue(row, candidates) {
  const normalizedCandidates = candidates.map(normalizeCsvHeader).filter(Boolean);
  const entries = Object.entries(row).map(([key, value]) => [normalizeCsvHeader(key), value]);
  const exact = entries.find(([key]) => normalizedCandidates.includes(key));
  if (exact) return exact[1];
  const partial = entries.find(([key]) => normalizedCandidates.some((candidate) => key.includes(candidate)));
  return partial?.[1] ?? "";
}

function parseFlexibleDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;
  const isoish = new Date(trimmed.replace(" ", "T"));
  if (!Number.isNaN(isoish.getTime())) return isoish;
  const match = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function looksLikeMyFitnessPalRows(rows) {
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return false;
  const has = (candidates) => {
    const normalizedCandidates = candidates.map(normalizeCsvHeader);
    return headers.some((header) => {
      const normalized = normalizeCsvHeader(header);
      return normalizedCandidates.some((candidate) => normalized.includes(candidate));
    });
  };
  const hasMacroShape = has(["protein"]) && has(["fat"]) && has(["carbohydrates", "carbs", "total carbohydrate"]);
  const hasActivityShape = has(["activity type", "moving time", "aerobic te", "avg hr", "avg pace"]);
  const hasDiarySignal = has(["meal", "food", "nutrition", "timestamp"]);
  return hasMacroShape && (!hasActivityShape || hasDiarySignal);
}

function nutritionReadinessNote(totals) {
  const protein = totals.protein ?? 0;
  const carbs = totals.carbs ?? 0;
  const calories = totals.calories ?? 0;
  if (calories && calories < 1600) return "Fuel looks light for endurance training; expect Elias to protect recovery.";
  if (protein < 80) return "Protein is light; Elias will factor that into recovery and strength work.";
  if (carbs < 140) return "Carbs are modest; Elias will keep an eye on harder run and bike days.";
  return "Fuel support looks usable for the next training decision.";
}

function summarizeMyFitnessPal(rows) {
  const entries = rows.map((row) => {
    const date = parseFlexibleDate(csvValue(row, ["date", "meal date", "day"]));
    return {
      date,
      key: date ? dateKey(date) : "Imported",
      meal: csvValue(row, ["meal", "meal name", "meal category"]) || "Logged",
      food: csvValue(row, ["food", "food name", "description", "item", "name"]),
      calories: parseNutritionNumber(csvValue(row, ["calories", "kcal", "energy"])),
      protein: parseNutritionNumber(csvValue(row, ["protein", "protein g", "protein (g)"])),
      carbs: parseNutritionNumber(csvValue(row, ["carbohydrates", "carbs", "total carbohydrate"])),
      fat: parseNutritionNumber(csvValue(row, ["fat", "total fat", "fat g", "fat (g)"])),
      fiber: parseNutritionNumber(csvValue(row, ["fiber", "dietary fiber"])),
      sugar: parseNutritionNumber(csvValue(row, ["sugar", "sugars"])),
      sodium: parseNutritionNumber(csvValue(row, ["sodium", "sodium mg"]))
    };
  }).filter((entry) => entry.date || ["calories", "protein", "carbs", "fat"].some((field) => entry[field] != null));

  if (!entries.length) {
    throw new Error("That looks like a MyFitnessPal file, but I could not read dated nutrition rows.");
  }

  const grouped = entries.reduce((map, entry) => {
    map.set(entry.key, [...(map.get(entry.key) || []), entry]);
    return map;
  }, new Map());
  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    if (a === "Imported") return -1;
    if (b === "Imported") return 1;
    return parseDate(a) - parseDate(b);
  });
  const latestDate = sortedKeys.at(-1);
  const latestEntries = grouped.get(latestDate) || [];
  const sum = (field) => Math.round(latestEntries.reduce((total, entry) => total + (entry[field] || 0), 0) * 10) / 10;
  const totals = {
    calories: sum("calories"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
    fiber: sum("fiber"),
    sugar: sum("sugar"),
    sodium: sum("sodium")
  };
  const validDates = entries.map((entry) => entry.date).filter(Boolean);
  const mealCount = new Set(latestEntries.map((entry) => entry.meal).filter(Boolean)).size;

  return {
    source: "MyFitnessPal CSV",
    importedAt: new Date().toISOString(),
    latestDate,
    dateLabel: latestDate === "Imported"
      ? "Imported nutrition"
      : formatDate(parseDate(latestDate), { month: "short", day: "numeric", year: "numeric" }),
    dateRange: validDates.length
      ? `${formatDate(new Date(Math.min(...validDates)))}-${formatDate(new Date(Math.max(...validDates)))}, ${new Date(Math.max(...validDates)).getFullYear()}`
      : "Imported rows",
    entryCount: latestEntries.length,
    mealCount,
    totals,
    readinessNote: nutritionReadinessNote(totals)
  };
}

function parseDuration(value) {
  if (!value || value === "--") return 0;
  const parts = value.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function csvActivityToLastSession(activity) {
  if (!activity) return null;
  return {
    source: "Garmin CSV",
    date: activity.date?.toISOString(),
    title: activity.title || activity.type || "Training session",
    sport: activity.type || "Training",
    distanceMiles: activity.distance,
    durationSeconds: activity.seconds,
    movingTimeSeconds: activity.movingSeconds,
    elapsedTimeSeconds: activity.elapsedSeconds,
    avgHr: activity.avgHr,
    maxHr: activity.maxHr,
    aerobicTe: activity.trainingEffect,
    avgPace: activity.avgPace,
    bestPace: activity.bestPace,
    calories: activity.calories,
    avgCadence: activity.avgCadence,
    maxCadence: activity.maxCadence,
    ascent: activity.ascent,
    descent: activity.descent,
    strideLength: activity.strideLength,
    steps: activity.steps,
    notes: "Imported from Garmin CSV."
  };
}

function summarizeActivities(rows) {
  const activities = rows
    .map((row) => ({
      type: row["Activity Type"] ?? "",
      title: row.Title || row["Activity Type"] || "Training session",
      date: row.Date ? new Date(row.Date.replace(" ", "T")) : null,
      distance: parseNumber(row.Distance),
      seconds: parseDuration(row.Time),
      movingSeconds: parseDuration(row["Moving Time"]),
      elapsedSeconds: parseDuration(row["Elapsed Time"]),
      calories: parseNumber(row.Calories),
      avgHr: parseNumber(row["Avg HR"]),
      maxHr: parseNumber(row["Max HR"]),
      trainingEffect: parseNumber(row["Aerobic TE"]),
      avgCadence: parseNumber(row["Avg Run Cadence"]),
      maxCadence: parseNumber(row["Max Run Cadence"]),
      avgPace: row["Avg Pace"] && row["Avg Pace"] !== "--" ? row["Avg Pace"] : null,
      bestPace: row["Best Pace"] && row["Best Pace"] !== "--" ? row["Best Pace"] : null,
      ascent: parseNumber(row["Total Ascent"]),
      descent: parseNumber(row["Total Descent"]),
      strideLength: parseNumber(row["Avg Stride Length"]),
      steps: parseNumber(row.Steps)
    }))
    .filter((activity) => activity.date && !Number.isNaN(activity.date.getTime()));

  const runs = activities.filter((activity) => activity.type.toLowerCase().includes("running") && activity.distance);
  const latest = [...activities].sort((a, b) => b.date - a.date)[0];
  const maxDate = latest?.date ?? parseDate(DEFAULT_TODAY);
  const fourWeekStart = new Date(maxDate);
  fourWeekStart.setDate(maxDate.getDate() - 28);
  const eightWeekStart = new Date(maxDate);
  eightWeekStart.setDate(maxDate.getDate() - 56);
  const recentRuns = runs.filter((runActivity) => runActivity.date >= fourWeekStart);
  const eightWeekRuns = runs.filter((runActivity) => runActivity.date >= eightWeekStart);
  const weekly = new Map();

  runs.forEach((runActivity) => {
    const week = dateKey(getWeekStart(runActivity.date));
    weekly.set(week, (weekly.get(week) ?? 0) + runActivity.distance);
  });

  const total = (field, list) => list.reduce((sum, item) => sum + (item[field] ?? 0), 0);
  const average = (field, list) => {
    const values = list.map((item) => item[field]).filter((value) => value != null);
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10;
  };

  return {
    source: "Imported CSV",
    activityCount: activities.length,
    runCount: runs.length,
    dateRange: activities.length
      ? `${formatDate(new Date(Math.min(...activities.map((item) => item.date))))}-${formatDate(new Date(Math.max(...activities.map((item) => item.date))))}, ${maxDate.getFullYear()}`
      : "No dated activities",
    runMiles: Math.round(total("distance", runs) * 100) / 100,
    runHours: Math.round(total("seconds", runs) / 3600 * 100) / 100,
    last4RunMiles: Math.round(total("distance", recentRuns) * 100) / 100,
    last4RunHours: Math.round(total("seconds", recentRuns) / 3600 * 100) / 100,
    last8RunMiles: Math.round(total("distance", eightWeekRuns) * 100) / 100,
    last8RunHours: Math.round(total("seconds", eightWeekRuns) / 3600 * 100) / 100,
    avgRecentHr: average("avgHr", recentRuns),
    avgRecentTrainingEffect: average("trainingEffect", recentRuns),
    recentPeakWeek: Math.round(Math.max(0, ...weekly.values()) * 100) / 100,
    latestActivity: latest ? `${formatDate(latest.date)} ${latest.type}, ${latest.distance ?? "--"} mi` : "No activity",
    lastSession: csvActivityToLastSession(latest),
    sourceNote: "Imported in this browser session. Future HealthKit, Strava, and Garmin sync can feed this same baseline."
  };
}

async function importTrainingDataFile(file) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".fit")) {
    const parser = window.FormedFitParser;
    if (!parser?.parseFitLastSession) {
      throw new Error("Garmin FIT importer is not available yet. Refresh and try again.");
    }
    const session = parser.parseFitLastSession(await file.arrayBuffer(), { fileName: file.name });
    saveLastSession(session);
    baseline = {
      ...baseline,
      latestActivity: `${formatDate(new Date(session.date))} ${session.title}, ${formatSeconds(session.durationSeconds)}`,
      sourceNote: "Last session imported from Garmin FIT. Run baseline remains from the latest Garmin CSV or Strava sync."
    };
    return `Imported Garmin FIT: ${session.title}, ${formatSeconds(session.durationSeconds)}.`;
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (looksLikeMyFitnessPalRows(rows)) {
    nutrition = summarizeMyFitnessPal(rows);
    saveJson("formedNutrition", nutrition);
    return `Imported MyFitnessPal fuel data for ${nutrition.dateLabel}.`;
  }

  baseline = summarizeActivities(rows);
  if (baseline.lastSession) saveLastSession(baseline.lastSession);
  return "Imported Garmin/Strava CSV baseline.";
}

function exportWeekCsv() {
  const headers = ["Date", "Day", "Sport", "Workout", "Minutes", "Intensity", "Intent", "Available Minutes", "Adaptation"];
  const lines = [
    headers.join(","),
    ...currentWeek.map((item) => [
      dateKey(item.date),
      item.day,
      item.sport,
      item.title,
      item.duration,
      item.intensity,
      item.intent,
      item.available,
      item.notes.join(" ") || "As planned."
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "formed-by-elias-week.csv";
  anchor.click();
  URL.revokeObjectURL(url);
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

function minutesFromClock(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function setClock(date, totalMinutes) {
  const next = new Date(date);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

function scheduledWorkoutWindow(item, durationMinutes) {
  const duration = Math.max(15, durationMinutes || 30);
  const baseDate = new Date(item.date ?? item);
  const day = item.day ?? dayNames[baseDate.getDay()];
  const isWeekend = ["Sat", "Sun"].includes(day);
  const defaultStart = minutesFromClock(isWeekend ? CALENDAR_DEFAULTS.weekendStart : CALENDAR_DEFAULTS.weekdayStart);
  const doneBy = minutesFromClock(isWeekend ? CALENDAR_DEFAULTS.weekendDoneBy : CALENDAR_DEFAULTS.weekdayDoneBy);
  const startMinutes = Math.min(defaultStart, doneBy - duration);
  const start = setClock(baseDate, Math.max(0, startMinutes));
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + duration);
  return { start, end };
}

function buildTimedEvent({ uid, summary, description, location, date, durationMinutes }) {
  const { start, end } = scheduledWorkoutWindow(date, durationMinutes);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;TZID=${TIMEZONE}:${formatIcsDateTime(start)}`,
    `DTEND;TZID=${TIMEZONE}:${formatIcsDateTime(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : null,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT"
  ].filter(Boolean);
}

function buildAllDayEvent({ uid, summary, description, location, date, endDate }) {
  const start = typeof date === "string" ? parseDate(date) : date;
  const end = endDate ? addDays(parseDate(endDate), 1) : addDays(start, 1);
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(start)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : null,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT"
  ].filter(Boolean);
}

function workoutToIcsEvent(item) {
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  const summary = `Training: ${item.title}`;
  const notes = item.notes.join(" ") || "As planned.";
  const description = [
    `${APP_NAME} with ${coachName}`,
    `Sport: ${item.sport}`,
    `Duration: ${item.duration ? `${item.duration} minutes` : "Rest day"}`,
    `Intensity: ${item.intensity}`,
    `Intent: ${item.intent}`,
    `Available: ${item.available} minutes`,
    `Adjustment: ${notes}`
  ].join("\n");
  const location = item.sport === "strength" ? "Amped Fitness" : "";
  const uid = `${dateKey(item.date)}-${item.sport}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@formed-by-elias`;

  if (!item.duration && item.sport === "rest") {
    return buildAllDayEvent({ uid, summary, description, location, date: item.date });
  }

  return buildTimedEvent({ uid, summary, description, location, date: item, durationMinutes: item.duration });
}

function raceToIcsEvent(event) {
  return buildAllDayEvent({
    uid: `${event.date}-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@formed-by-elias`,
    summary: `Race: ${event.name}`,
    location: event.location,
    date: event.date,
    endDate: event.endDate,
    description: [
      `${APP_NAME} race target`,
      `Type: ${event.type}`,
      `Distance: ${event.distance}`,
      `Priority: ${event.priority}`
    ].join("\n")
  });
}

function exportWeekIcs() {
  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Formed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${coachProfile.coachName || DEFAULT_COACH_NAME}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    ...currentWeek.flatMap(workoutToIcsEvent),
    ...events.flatMap(raceToIcsEvent),
    "END:VCALENDAR"
  ].map(foldIcsLine);
  const blob = new Blob([`${calendarLines.join("\r\n")}\r\n`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "formed-by-elias.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

function render() {
  const today = parseDate(els.todayInput.value || DEFAULT_TODAY);
  const readiness = getReadiness();
  const phase = getPhase(today);
  const availability = getAvailability();
  currentWeek = applyWorkoutOverrides(buildWeek(today, phase, readiness, availability));

  renderCountdown(today);
  renderReadiness(readiness);
  renderCoachIdentity();
  renderPhase(phase);
  renderWeek(today, currentWeek);
  renderWorkoutSelect();
  renderDailyCallout(today, currentWeek, readiness, phase);
  renderBaseline();
  renderLastSession();
  renderNutrition();
  renderCoachConversation();
  renderTimeline(today);
}

function fallbackCoachReply(prompt) {
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  const readiness = getReadiness();
  const nextKey = currentWeek.find((item) => !completedWorkouts.has(workoutId(item))) ?? currentWeek[0];
  const caution = readiness.level === "green"
    ? "We can build, but we still keep the easy work honest."
    : readiness.level === "amber"
      ? "I’m going to keep pressure controlled until recovery signals improve."
      : "The next move is recovery first, training second.";
  const fuel = nutritionCoachSummary();
  return `${coachName}: I hear you. ${caution} ${fuel ? `${fuel} ` : ""}For this plan, the next anchor is ${nextKey.title}. Keep the family clock protected, log sleep/HRV, and tell me after the session whether it felt smooth, heavy, or painful. You said: “${prompt}”`;
}

async function askCoach() {
  const prompt = els.planPromptInput.value.trim();
  if (!prompt) return;
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  coachMessages.push({ role: "user", text: prompt });
  coachMessages.push({ role: "coach", text: `${coachName} is thinking...` });
  renderCoachConversation();
  els.planPromptInput.value = "";

  try {
    const response = await fetch("/api/coach/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachName,
        prompt,
        context: {
          baseline,
          nutrition,
          currentWeek: currentWeek.map((item) => ({
            day: item.day,
            title: item.title,
            sport: item.sport,
            duration: item.duration,
            intent: item.intent
          })),
          readiness: getReadiness()
        }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Coach API unavailable.");
    coachMessages[coachMessages.length - 1] = { role: "coach", text: payload.message };
  } catch {
    coachMessages[coachMessages.length - 1] = { role: "coach", text: fallbackCoachReply(prompt) };
  }

  saveJson("formedCoachMessages", coachMessages);
  renderCoachConversation();
}

function askCoachFromTop(event) {
  event.preventDefault();
  const prompt = els.topCoachInput.value.trim();
  if (!prompt) return;
  els.planPromptInput.value = prompt;
  els.topCoachInput.value = "";
  askCoach();
}

function localFeedbackAdaptation(workout, nextWorkout, feedback) {
  const coachName = coachProfile.coachName || DEFAULT_COACH_NAME;
  const rpe = Number(feedback.rpe);
  const concern = feedback.feeling === "pain" || rpe >= 9;
  const rough = feedback.feeling === "rough" || rpe >= 8;
  const strong = feedback.feeling === "strong" && rpe <= 5;

  if (!nextWorkout) {
    return {
      message: `${coachName}: Logged. No later session is on this generated week, so I’d use this as a signal for the next refresh.`,
      adaptation: null
    };
  }

  if (concern) {
    return {
      message: `${coachName}: I’m treating that as a yellow flag. The next session becomes recovery-focused. If pain persists or changes your gait/form, don’t train through it.`,
      adaptation: {
        title: "Recovery replacement",
        sport: "recovery",
        duration: Math.min(25, Math.max(15, nextWorkout.duration || 20)),
        intent: "Walk, mobility, hydration, and reassess before resuming load.",
        intensity: "low",
        className: "recovery",
        notes: [`Adapted after ${workout.title}: pain/high strain feedback.`]
      }
    };
  }

  if (rough) {
    return {
      message: `${coachName}: Good data. I’m trimming the next session so you keep the streak without digging a hole.`,
      adaptation: {
        duration: Math.max(20, Math.round((nextWorkout.duration || 30) * 0.7 / 5) * 5),
        intensity: "low",
        className: "compressed",
        notes: [`Reduced after ${workout.title}: RPE ${rpe}, ${feedback.feeling}.`]
      }
    };
  }

  if (strong) {
    return {
      message: `${coachName}: Nice. We keep the next session intact and add only a small optional finish, because consistency beats a victory lap.`,
      adaptation: {
        notes: [`Feedback after ${workout.title}: felt strong. Optional 4 x 20s relaxed strides if this is a run.`]
      }
    };
  }

  return {
    message: `${coachName}: Logged. No change needed. The next session stays as planned.`,
    adaptation: {
      notes: [`Feedback after ${workout.title}: RPE ${rpe}, ${feedback.feeling}. Keep plan steady.`]
    }
  };
}

async function completeWorkoutWithFeedback() {
  const index = Number(els.completedWorkoutSelect.value);
  const workout = currentWeek[index];
  if (!workout) return;
  const nextWorkout = currentWeek.slice(index + 1).find((item) => !completedWorkouts.has(workoutId(item)));
  const feedback = {
    rpe: Number(els.rpeInput.value),
    feeling: els.feelingInput.value,
    notes: els.feedbackNotesInput.value.trim()
  };
  completedWorkouts.add(workoutId(workout));
  saveJson("formedCompletedWorkouts", [...completedWorkouts]);
  els.feedbackResponse.textContent = "Coach is reviewing feedback...";

  let result;
  try {
    const response = await fetch("/api/coach/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachName: coachProfile.coachName || DEFAULT_COACH_NAME,
        workout,
        nextWorkout,
        feedback,
        baseline,
        nutrition
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Feedback API unavailable.");
    result = payload;
  } catch {
    result = localFeedbackAdaptation(workout, nextWorkout, feedback);
  }

  if (nextWorkout && result.adaptation) {
    const id = workoutId(nextWorkout);
    workoutOverrides[id] = {
      ...(workoutOverrides[id] || {}),
      ...result.adaptation,
      notes: [...(workoutOverrides[id]?.notes || []), ...(result.adaptation.notes || [])]
    };
    saveJson("formedWorkoutOverrides", workoutOverrides);
  }
  coachMessages.push({ role: "user", text: `Completed ${workout.title}. RPE ${feedback.rpe}. Felt ${feedback.feeling}. ${feedback.notes}`.trim() });
  coachMessages.push({ role: "coach", text: result.message });
  saveJson("formedCoachMessages", coachMessages);
  saveLastSession({
    source: "Formed feedback",
    date: workout.date.toISOString(),
    title: workout.title,
    sport: workout.sport,
    durationMinutes: workout.duration,
    intensity: workout.intensity,
    available: workout.available,
    intent: workout.intent,
    rpe: feedback.rpe,
    feeling: feedback.feeling,
    notes: feedback.notes || "Completed from the generated plan.",
    adaptationNote: result.message
  });
  els.feedbackResponse.textContent = result.message;
  els.feedbackNotesInput.value = "";
  render();
}

function serverActivityToLastSession(activity) {
  if (!activity) return null;
  return {
    source: activity.source || "Strava",
    date: activity.date || activity.start_date,
    title: activity.title || activity.name || "Training session",
    sport: activity.sport || activity.type || activity.sport_type || "Training",
    distanceMiles: activity.distanceMiles,
    durationSeconds: activity.durationSeconds,
    movingTimeSeconds: activity.movingTimeSeconds,
    elapsedTimeSeconds: activity.elapsedTimeSeconds,
    avgHr: activity.avgHr,
    maxHr: activity.maxHr,
    avgWatts: activity.avgWatts,
    avgPace: activity.avgPace,
    avgSpeedMph: activity.avgSpeedMph,
    notes: activity.notes || "Synced from Strava."
  };
}

async function fetchLatestSession(token, { silent = false } = {}) {
  if (!token) return;
  try {
    const response = await fetch(apiUrl(`/api/activities/latest?token=${encodeURIComponent(token)}`));
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Latest activity unavailable.");
    const session = serverActivityToLastSession(payload.activity);
    if (session) {
      saveLastSession(session);
      renderLastSession();
    }
  } catch (error) {
    if (!silent && els.syncStatus) {
      els.syncStatus.textContent = `${error.message} Sync Strava again after Supabase is configured.`;
    }
  }
}

function syncStatus(message) {
  if (!els.syncStatus) return;
  els.syncStatus.dataset.touched = "true";
  els.syncStatus.textContent = message;
}

async function syncStravaActivities({ promptForToken = false, silent = false } = {}) {
  if (!els.syncStatus) return;
  if (syncInFlight) return;
  let token = getSyncToken({ prompt: promptForToken });
  if (!token) {
    if (!silent) syncStatus("Background sync is ready. It will run automatically once the private token is saved in this browser.");
    return;
  }
  syncInFlight = true;
  if (!silent) syncStatus("Background Strava sync running...");
  try {
    const response = await fetch(apiUrl(`/api/strava/sync?token=${encodeURIComponent(token)}`));
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(SYNC_TOKEN_KEY);
      }
      throw new Error(payload.error || "Sync is not configured yet.");
    }
    const session = serverActivityToLastSession(payload.latest_activity);
    if (session) saveLastSession(session);
    lastAutoSyncAt = Date.now();
    syncStatus(`Background sync healthy. Last checked ${new Date(lastAutoSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`);
    renderLastSession();
  } catch (error) {
    if (!silent) {
      syncStatus(`${error.message} Background sync paused; Garmin FIT import still works.`);
    }
  } finally {
    syncInFlight = false;
  }
}

function startBackgroundSync() {
  const params = new URLSearchParams(location.search);
  const justConnected = params.get("strava") === "connected";
  syncStravaActivities({ promptForToken: justConnected, silent: !justConnected });

  window.setInterval(() => {
    syncStravaActivities({ silent: true });
  }, AUTO_SYNC_INTERVAL_MS);

  const syncAfterFocus = () => {
    if (Date.now() - lastAutoSyncAt > FOCUS_SYNC_THROTTLE_MS) {
      syncStravaActivities({ silent: true });
    }
  };
  window.addEventListener("focus", syncAfterFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncAfterFocus();
  });
}

function bindEvents() {
  [
    els.todayInput,
    els.sleepInput,
    els.hrvInput,
    els.rhrInput,
    els.sorenessInput,
    els.lifeInput,
    els.illnessInput,
    els.eventModeInput
  ].forEach((element) => element.addEventListener("input", render));

  els.resetAvailabilityButton.addEventListener("click", () => {
    mondayOrder.forEach((day) => {
      const input = document.querySelector(`[data-availability="${day}"]`);
      input.value = availabilityDefaults[day];
      input.nextElementSibling.textContent = `${availabilityDefaults[day]}m`;
    });
    render();
  });

  els.csvInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const message = await importTrainingDataFile(file);
      render();
      els.dataNote.textContent = message;
    } catch (error) {
      els.dataNote.textContent = error.message || "Import failed. Try another file.";
    } finally {
      event.target.value = "";
    }
  });

  els.exportButton.addEventListener("click", exportWeekCsv);
  els.icalButton.addEventListener("click", exportWeekIcs);
  els.saveCoachButton.addEventListener("click", saveCoachProfile);
  els.coachNameInput.addEventListener("change", saveCoachProfile);
  els.coachQuickChat.addEventListener("submit", askCoachFromTop);
  els.askCoachButton.addEventListener("click", askCoach);
  els.completeWorkoutButton.addEventListener("click", completeWorkoutWithFeedback);
  els.rpeInput.addEventListener("input", () => {
    els.rpeOutput.textContent = els.rpeInput.value;
  });
}

function init() {
  els.todayInput.value = DEFAULT_TODAY;
  els.coachNameInput.value = coachProfile.coachName || DEFAULT_COACH_NAME;
  buildAvailabilityControls();
  renderStrengthMenu();
  bindEvents();
  render();
  fetchLatestSession(getSyncToken(), { silent: true });
  startBackgroundSync();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

init();
