const { handleError, json } = require("../_lib/config");
const { callOpenAI, fallbackDialogue, readJsonBody } = require("../_lib/coach-ai");
const { upsert } = require("../_lib/supabase");

async function saveMessages({ coachName, prompt, message, context }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  await upsert("coach_messages", [
    {
      athlete_id: process.env.ATHLETE_ID || null,
      coach_name: coachName,
      role: "user",
      content: prompt,
      context
    },
    {
      athlete_id: process.env.ATHLETE_ID || null,
      coach_name: coachName,
      role: "coach",
      content: message,
      context
    }
  ]);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      return res.end();
    }
    const body = await readJsonBody(req);
    const coachName = body.coachName || process.env.COACH_NAME || "Elias";
    const fallback = fallbackDialogue({ coachName, prompt: body.prompt, context: body.context });
    const message = await callOpenAI({
      instructions: `You are ${coachName}, an adaptive wellness coach inside Formed. Be concise, practical, warm, and safety-aware. You help endurance athletes train around family, work, travel, sleep, HRV, soreness, and race goals. Do not give medical diagnosis. Ask one useful follow-up when needed.`,
      input: JSON.stringify({
        user_prompt: body.prompt,
        context: body.context
      })
    }) || fallback;

    await saveMessages({ coachName, prompt: body.prompt, message, context: body.context }).catch(() => {});
    json(res, 200, { message });
  } catch (error) {
    handleError(res, error);
  }
};
