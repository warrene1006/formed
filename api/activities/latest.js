const { handleError, json, requireFeedToken } = require("../_lib/config");
const { select } = require("../_lib/supabase");
const { summarizeActivity } = require("../_lib/activity-summary");

module.exports = async function handler(req, res) {
  try {
    requireFeedToken(req);
    const athleteFilter = process.env.ATHLETE_ID
      ? `&athlete_id=eq.${encodeURIComponent(process.env.ATHLETE_ID)}`
      : "";
    const [activity] = await select(
      "activities",
      `?select=*&order=start_date.desc&limit=1${athleteFilter}`
    );

    json(res, 200, {
      activity: summarizeActivity(activity)
    });
  } catch (error) {
    handleError(res, error);
  }
};
