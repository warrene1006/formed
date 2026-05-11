const { getBaseUrl, handleError } = require("../_lib/config");
const { signState } = require("../_lib/oauth-state");
const { authorizationUrl } = require("../_lib/strava");

module.exports = async function handler(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/strava/callback`;
    const state = signState({ returnTo: "/" });
    res.statusCode = 302;
    res.setHeader("Location", authorizationUrl({ redirectUri, state }));
    res.end();
  } catch (error) {
    handleError(res, error);
  }
};
