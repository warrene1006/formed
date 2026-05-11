const DEFAULT_TIMEZONE = "America/Chicago";

function cleanBaseUrl(value) {
  return value ? value.replace(/\/+$/, "") : "";
}

function getBaseUrl(req) {
  const configured = cleanBaseUrl(process.env.PUBLIC_APP_URL || process.env.BASE_URL);
  if (configured) return configured;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const host = req?.headers?.host || "localhost:3000";
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

function getRequiredEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    const error = new Error(`Missing required environment variables: ${missing.join(", ")}`);
    error.statusCode = 500;
    error.missing = missing;
    throw error;
  }
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function getCalendarSettings() {
  return {
    appName: process.env.APP_NAME || "Formed",
    coachName: process.env.COACH_NAME || "Elias",
    calendarName: process.env.CALENDAR_NAME || "Elias",
    timezone: process.env.TIMEZONE || DEFAULT_TIMEZONE,
    weekdayStart: process.env.WEEKDAY_START || "05:30",
    weekdayDoneBy: process.env.WEEKDAY_DONE_BY || "07:00",
    weekendStart: process.env.WEEKEND_START || "05:45",
    weekendDoneBy: process.env.WEEKEND_DONE_BY || "07:30",
    publishRestDays: process.env.PUBLISH_REST_DAYS !== "false"
  };
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function handleError(res, error) {
  json(res, error.statusCode || 500, {
    error: error.message || "Unexpected server error",
    missing: error.missing
  });
}

function requireFeedToken(req) {
  const expected = process.env.CALENDAR_TOKEN;
  if (!expected) return;

  const queryToken = req.query?.token;
  const auth = req.headers?.authorization || "";
  const headerToken = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (queryToken !== expected && headerToken !== expected) {
    const error = new Error("Calendar token is missing or invalid.");
    error.statusCode = 401;
    throw error;
  }
}

module.exports = {
  DEFAULT_TIMEZONE,
  getBaseUrl,
  getRequiredEnv,
  getCalendarSettings,
  handleError,
  json,
  requireFeedToken
};
