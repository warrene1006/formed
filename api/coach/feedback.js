const { handleError, json } = require("../_lib/config");
const { callOpenAI, fallbackFeedback, readJsonBody } = require("../_lib/coach-ai");
const { upsert } = require("../_lib/supabase");

async function saveFeedback({ coachName, body, result }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  await upsert("session_feedback", [{
    athlete_id: process.env.ATHLETE_ID || null,
    workout_date: body.workout?.date ? String(body.workout.date).slice(0, 10) : null,
    workout_title: body.workout?.title || null,
    sport: body.workout?.sport || null,
    rpe: body.feedback?.rpe || null,
    feeling: body.feedback?.feeling || null,
    notes: body.feedback?.notes || null,
    coach_name: coachName,
    coach_message: result.message,
    adaptation: result.adaptation || null
  }]);
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
    const fallback = fallbackFeedback({
      coachName,
      workout: body.workout,
      nextWorkout: body.nextWorkout,
      feedback: body.feedback
    });

    const aiText = await callOpenAI({
      instructions: `You are ${coachName}, an adaptive wellness coach inside Formed. Given completed-session feedback, return strict JSON with "message" and "adaptation". Adaptation may include title, sport, duration, intent, intensity, className, and notes. Be conservative with pain, very high RPE, illness, or family constraints. Do not diagnose.`,
      input: JSON.stringify({
        completed_workout: body.workout,
        next_workout: body.nextWorkout,
        feedback: body.feedback,
        baseline: body.baseline
      })
    });

    if (!aiText) {
      await saveFeedback({ coachName, body, result: fallback }).catch(() => {});
      return json(res, 200, fallback);
    }

    try {
      const result = JSON.parse(aiText);
      await saveFeedback({ coachName, body, result }).catch(() => {});
      return json(res, 200, result);
    } catch {
      const result = {
        message: aiText,
        adaptation: fallback.adaptation
      };
      await saveFeedback({ coachName, body, result }).catch(() => {});
      return json(res, 200, result);
    }
  } catch (error) {
    handleError(res, error);
  }
};
