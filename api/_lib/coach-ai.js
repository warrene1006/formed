const { getRequiredEnv } = require("./config");

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function fallbackDialogue({ coachName, prompt, context }) {
  const next = context?.currentWeek?.[0];
  const readiness = context?.readiness?.label || "Adjust";
  return `${coachName}: I hear you. I’m going to keep the plan practical and protect the family clock. Current readiness is ${readiness}. Next anchor: ${next?.title || "the next easy session"}. Tell me after the workout how it landed, and I’ll adapt the next session instead of forcing the original plan.`;
}

function fallbackFeedback({ coachName, workout, nextWorkout, feedback }) {
  const rpe = Number(feedback?.rpe || 6);
  const feeling = feedback?.feeling || "normal";
  const rough = feeling === "rough" || rpe >= 8;
  const concern = feeling === "pain" || rpe >= 9;

  if (!nextWorkout) {
    return {
      message: `${coachName}: Logged. No next session is available in this generated week yet.`,
      adaptation: null
    };
  }

  if (concern) {
    return {
      message: `${coachName}: I’m adapting the next session to recovery. Pain or high strain is information, not a character test.`,
      adaptation: {
        title: "Recovery replacement",
        sport: "recovery",
        duration: Math.min(25, Math.max(15, nextWorkout.duration || 20)),
        intent: "Walk, mobility, hydration, and reassess before adding load.",
        intensity: "low",
        className: "recovery",
        notes: [`Adapted after ${workout.title}: pain/high strain feedback.`]
      }
    };
  }

  if (rough) {
    return {
      message: `${coachName}: I’m trimming the next session. Keep the rhythm, drop the cost.`,
      adaptation: {
        duration: Math.max(20, Math.round((nextWorkout.duration || 30) * 0.7 / 5) * 5),
        intensity: "low",
        className: "compressed",
        notes: [`Reduced after ${workout.title}: RPE ${rpe}, ${feeling}.`]
      }
    };
  }

  return {
    message: `${coachName}: Logged. Next session stays steady.`,
    adaptation: {
      notes: [`Feedback after ${workout.title}: RPE ${rpe}, ${feeling}.`]
    }
  };
}

function extractOutputText(payload) {
  if (payload.output_text) return payload.output_text;
  const messages = payload.output || [];
  return messages
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callOpenAI({ instructions, input }) {
  if (!process.env.OPENAI_API_KEY) return null;
  const env = getRequiredEnv(["OPENAI_API_KEY"]);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions,
      input,
      store: false,
      max_output_tokens: 700
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error?.message || "OpenAI coach request failed.");
    error.statusCode = response.status;
    throw error;
  }
  return extractOutputText(payload);
}

module.exports = {
  callOpenAI,
  fallbackDialogue,
  fallbackFeedback,
  readJsonBody
};
