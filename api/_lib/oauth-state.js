const crypto = require("crypto");

function signState(payload = {}) {
  const secret = process.env.APP_SECRET || process.env.CALENDAR_TOKEN;
  if (!secret) {
    const error = new Error("APP_SECRET or CALENDAR_TOKEN is required for Strava OAuth state signing.");
    error.statusCode = 500;
    throw error;
  }

  const body = Buffer.from(JSON.stringify({
    ...payload,
    ts: Date.now()
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyState(state) {
  const secret = process.env.APP_SECRET || process.env.CALENDAR_TOKEN;
  if (!secret || !state || !state.includes(".")) {
    const error = new Error("Invalid OAuth state.");
    error.statusCode = 400;
    throw error;
  }

  const [body, signature] = state.split(".");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (signature.length !== expected.length) {
    const error = new Error("OAuth state signature mismatch.");
    error.statusCode = 400;
    throw error;
  }
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    const error = new Error("OAuth state signature mismatch.");
    error.statusCode = 400;
    throw error;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (Date.now() - payload.ts > 15 * 60 * 1000) {
    const error = new Error("OAuth state expired. Start Strava connection again.");
    error.statusCode = 400;
    throw error;
  }
  return payload;
}

module.exports = { signState, verifyState };
