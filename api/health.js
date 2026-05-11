const { json } = require("./_lib/config");

module.exports = function handler(req, res) {
  json(res, 200, {
    ok: true,
    app: "Formed",
    coach: process.env.COACH_NAME || "Elias"
  });
};
