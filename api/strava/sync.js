const { handleError, json, requireFeedToken } = require("../_lib/config");
const { select, upsert } = require("../_lib/supabase");
const { refreshAccessToken, getAthleteActivities } = require("../_lib/strava");

async function getStoredToken() {
  const athleteQuery = process.env.ATHLETE_ID
    ? `?select=*&athlete_id=eq.${encodeURIComponent(process.env.ATHLETE_ID)}&limit=1`
    : "?select=*&order=updated_at.desc&limit=1";
  const [token] = await select("strava_tokens", athleteQuery);
  if (!token) {
    const error = new Error("No Strava token stored yet. Connect Strava first.");
    error.statusCode = 404;
    throw error;
  }
  return token;
}

function mapActivity(activity, athleteId) {
  return {
    id: activity.id,
    athlete_id: athleteId,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: activity.start_date,
    distance_meters: activity.distance,
    moving_time_seconds: activity.moving_time,
    elapsed_time_seconds: activity.elapsed_time,
    average_heartrate: activity.average_heartrate || null,
    max_heartrate: activity.max_heartrate || null,
    weighted_average_watts: activity.weighted_average_watts || null,
    average_speed: activity.average_speed || null,
    raw: activity,
    updated_at: new Date().toISOString()
  };
}

module.exports = async function handler(req, res) {
  try {
    requireFeedToken(req);
    let token = await getStoredToken();
    const now = Math.floor(Date.now() / 1000);

    if (Number(token.expires_at) <= now + 3600) {
      const refreshed = await refreshAccessToken(token.refresh_token);
      const [updated] = await upsert("strava_tokens", [{
        athlete_id: token.athlete_id,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString()
      }], "athlete_id");
      token = { ...token, ...updated };
    }

    const after = Math.floor((Date.now() - 120 * 24 * 60 * 60 * 1000) / 1000);
    const activities = await getAthleteActivities(token.access_token, { after, perPage: 100, maxPages: 2 });
    const records = activities.map((activity) => mapActivity(activity, token.athlete_id));
    if (records.length) {
      await upsert("activities", records, "id");
    }

    json(res, 200, {
      synced: records.length,
      athlete_id: token.athlete_id,
      newest_activity: records[0]?.start_date || null
    });
  } catch (error) {
    handleError(res, error);
  }
};
