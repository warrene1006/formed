const crypto = require("crypto");
const { getBaseUrl, handleError } = require("../_lib/config");
const { verifyState } = require("../_lib/oauth-state");
const { exchangeCode } = require("../_lib/strava");
const { upsert } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  try {
    if (req.query.error) {
      const error = new Error(`Strava authorization failed: ${req.query.error}`);
      error.statusCode = 400;
      throw error;
    }

    verifyState(req.query.state);
    const token = await exchangeCode(req.query.code);
    const athleteId = token.athlete.id;
    const calendarToken = process.env.CALENDAR_TOKEN || crypto.randomBytes(24).toString("base64url");

    await upsert("strava_tokens", [{
      athlete_id: athleteId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      scope: req.query.scope || "",
      athlete: token.athlete,
      updated_at: new Date().toISOString()
    }], "athlete_id");

    await upsert("user_settings", [{
      athlete_id: athleteId,
      calendar_token: calendarToken,
      calendar_name: process.env.CALENDAR_NAME || "Elias",
      weekday_start: process.env.WEEKDAY_START || "05:30",
      weekday_done_by: process.env.WEEKDAY_DONE_BY || "07:00",
      weekend_start: process.env.WEEKEND_START || "05:45",
      weekend_done_by: process.env.WEEKEND_DONE_BY || "07:30",
      publish_all_workouts: true,
      coach_name: process.env.COACH_NAME || "Elias",
      app_name: process.env.APP_NAME || "Formed",
      updated_at: new Date().toISOString()
    }], "athlete_id");

    const baseUrl = getBaseUrl(req);
    res.statusCode = 302;
    res.setHeader("Location", `${baseUrl}/?strava=connected`);
    res.end();
  } catch (error) {
    handleError(res, error);
  }
};
