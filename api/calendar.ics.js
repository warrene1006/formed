const { getCalendarSettings, handleError, requireFeedToken } = require("./_lib/config");
const { select } = require("./_lib/supabase");
const { buildCalendar } = require("./_lib/planner");

async function getActivities() {
  const athleteFilter = process.env.ATHLETE_ID
    ? `&athlete_id=eq.${encodeURIComponent(process.env.ATHLETE_ID)}`
    : "";
  return select(
    "activities",
    `?select=*&order=start_date.desc&limit=200${athleteFilter}`
  );
}

module.exports = async function handler(req, res) {
  try {
    requireFeedToken(req);
    const settings = getCalendarSettings();
    const activities = await getActivities();
    const body = buildCalendar({ settings, activities });
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
  } catch (error) {
    handleError(res, error);
  }
};
