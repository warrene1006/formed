const { getBaseUrl, getRequiredEnv, handleError, json, requireFeedToken } = require("../_lib/config");

module.exports = async function handler(req, res) {
  try {
    requireFeedToken(req);
    const env = getRequiredEnv([
      "STRAVA_CLIENT_ID",
      "STRAVA_CLIENT_SECRET",
      "STRAVA_WEBHOOK_VERIFY_TOKEN"
    ]);
    const callbackUrl = `${getBaseUrl(req)}/api/strava/webhook`;
    const body = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      callback_url: callbackUrl,
      verify_token: env.STRAVA_WEBHOOK_VERIFY_TOKEN
    });

    const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
      method: "POST",
      body
    });
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload.message || "Strava webhook subscription failed.");
      error.statusCode = response.status;
      error.details = payload;
      throw error;
    }

    json(res, 200, {
      ok: true,
      callback_url: callbackUrl,
      subscription: payload
    });
  } catch (error) {
    handleError(res, error);
  }
};
