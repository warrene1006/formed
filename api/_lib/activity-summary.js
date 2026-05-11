function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 1) {
  const number = numberOrNull(value);
  if (number == null) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function paceFromSpeed(speedMetersPerSecond) {
  const speed = numberOrNull(speedMetersPerSecond);
  if (!speed || speed <= 0) return null;
  const totalSeconds = Math.round(1609.344 / speed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function summarizeActivity(activity) {
  if (!activity) return null;
  const sport = activity.sport_type || activity.type || "Training";
  const distanceMeters = numberOrNull(activity.distance_meters ?? activity.distance);
  const averageSpeed = numberOrNull(activity.average_speed);
  const runLike = `${sport}`.toLowerCase().includes("run");

  return {
    source: "Strava",
    date: activity.start_date || null,
    title: activity.name || sport,
    sport,
    distanceMiles: distanceMeters != null ? round(distanceMeters / 1609.344, 2) : null,
    durationSeconds: numberOrNull(activity.moving_time_seconds ?? activity.moving_time),
    movingTimeSeconds: numberOrNull(activity.moving_time_seconds ?? activity.moving_time),
    elapsedTimeSeconds: numberOrNull(activity.elapsed_time_seconds ?? activity.elapsed_time),
    avgHr: round(activity.average_heartrate, 0),
    maxHr: round(activity.max_heartrate, 0),
    avgWatts: round(activity.weighted_average_watts, 0),
    avgPace: runLike ? paceFromSpeed(averageSpeed) : null,
    avgSpeedMph: !runLike && averageSpeed ? round(averageSpeed * 2.236936, 1) : null,
    notes: "Synced from Strava."
  };
}

module.exports = { summarizeActivity };
