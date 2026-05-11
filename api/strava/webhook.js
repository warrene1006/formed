const crypto = require("crypto");
const { handleError, json } = require("../_lib/config");
const { upsert } = require("../_lib/supabase");

async function readRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function verifySignature(req, rawBody) {
  const secret = process.env.STRAVA_WEBHOOK_SIGNING_SECRET;
  if (!secret) return;

  const header = req.headers["x-strava-signature"];
  if (!header) {
    const error = new Error("Missing Strava webhook signature.");
    error.statusCode = 401;
    throw error;
  }

  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    const error = new Error("Expired Strava webhook signature.");
    error.statusCode = 401;
    throw error;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  if (!parts.v1 || parts.v1.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
    const error = new Error("Invalid Strava webhook signature.");
    error.statusCode = 401;
    throw error;
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (req.query["hub.verify_token"] !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
        return json(res, 403, { error: "Invalid Strava verify token." });
      }
      return json(res, 200, { "hub.challenge": req.query["hub.challenge"] });
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, POST");
      return res.end();
    }

    const rawBody = await readRawBody(req);
    verifySignature(req, rawBody);
    const event = typeof req.body === "object" && req.body ? req.body : JSON.parse(rawBody);
    const id = [
      event.subscription_id,
      event.owner_id,
      event.object_type,
      event.object_id,
      event.aspect_type,
      event.event_time
    ].join(":");

    await upsert("strava_webhook_events", [{
      id,
      object_type: event.object_type,
      object_id: event.object_id,
      aspect_type: event.aspect_type,
      owner_id: event.owner_id,
      subscription_id: event.subscription_id,
      event_time: event.event_time,
      updates: event.updates || {},
      raw: event,
      created_at: new Date().toISOString()
    }], "id");

    return json(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
