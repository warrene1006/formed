const { getRequiredEnv } = require("./config");

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

function getStravaEnv() {
  const env = getRequiredEnv(["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"]);
  if (!/^\d+$/.test(env.STRAVA_CLIENT_ID)) {
    const error = new Error("STRAVA_CLIENT_ID must be the numeric Client ID from Strava, not placeholder text.");
    error.statusCode = 500;
    error.missing = ["STRAVA_CLIENT_ID"];
    throw error;
  }
  return env;
}

function authorizationUrl({ redirectUri, state }) {
  const env = getStravaEnv();
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read,activity:read_all",
    state
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

async function tokenRequest(params) {
  const env = getStravaEnv();
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    ...params
  });
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || "Strava token request failed.");
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

function exchangeCode(code) {
  return tokenRequest({
    code,
    grant_type: "authorization_code"
  });
}

function refreshAccessToken(refreshToken) {
  return tokenRequest({
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
}

async function getAthleteActivities(accessToken, { after, perPage = 100, maxPages = 2 } = {}) {
  const activities = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page)
    });
    if (after) params.set("after", String(after));
    const response = await fetch(`${STRAVA_API_URL}/athlete/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload.message || "Strava activity sync failed.");
      error.statusCode = response.status;
      throw error;
    }
    activities.push(...payload);
    if (payload.length < perPage) break;
  }
  return activities;
}

module.exports = {
  authorizationUrl,
  exchangeCode,
  refreshAccessToken,
  getAthleteActivities
};
