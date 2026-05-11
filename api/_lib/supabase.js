const { getRequiredEnv } = require("./config");

function getSupabaseConfig() {
  const env = getRequiredEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  return {
    url: env.SUPABASE_URL.replace(/\/+$/, ""),
    key: env.SUPABASE_SERVICE_ROLE_KEY
  };
}

function headers(extra = {}) {
  const config = getSupabaseConfig();
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function request(path, options = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.message || `Supabase request failed: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function select(table, query = "") {
  return request(`${table}${query}`, { method: "GET" });
}

async function upsert(table, records, onConflict) {
  const suffix = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  return request(`${table}${suffix}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(records)
  });
}

module.exports = { select, upsert };
