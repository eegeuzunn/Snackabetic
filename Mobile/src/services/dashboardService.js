import api from "./api";
import { getMyProfile } from "./patientService";

/**
 * Fetches all data needed for the Dashboard screen in parallel:
 *   - today's meals  (→ carb total)
 *   - patient profile  (→ carb/glucose targets)
 *   - glucose trend for last `days` days
 *   - today's glucose daily-stats (min/max/avg)
 */
export async function getDashboardData(days = 7) {
  const today = new Date().toISOString().slice(0, 10);

  const [mealsResult, profileResult, statsResult, trendPoints] =
    await Promise.all([
      // Today's meals
      api
        .get("/meals/by-date", { params: { date: today } })
        .catch(() => []),

      // Patient profile (glucose / carb targets)
      getMyProfile().catch(() => null),

      // Today's glucose daily stats
      api
        .get("/glucose-readings/daily-stats", { params: { date: today } })
        .catch(() => null),

      // Last N days glucose trend
      buildGlucoseTrend(days),
    ]);

  // Sum carbs from all meals today
  const meals = Array.isArray(mealsResult) ? mealsResult : [];
  const totalCarbsG =
    Math.round(
      meals.reduce((s, m) => s + (parseFloat(m.totalCarbsG) || 0), 0) * 10,
    ) / 10;

  return {
    totalCarbsG,
    profile: profileResult,         // PatientProfileResponse | null
    dailyStats: statsResult,        // { avg, min, max } | null
    glucoseTrend: trendPoints,      // [{ date, avg }]
  };
}

/** Fetches glucose by-date for each day and returns avg per day */
async function buildGlucoseTrend(days) {
  const base = new Date();
  const results = [];

  await Promise.allSettled(
    Array.from({ length: days }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);

      return api
        .get("/glucose-readings/by-date", { params: { date: dateStr } })
        .then((readings) => {
          const arr = Array.isArray(readings) ? readings : [];
          const avg =
            arr.length > 0
              ? Math.round(
                  arr.reduce((s, r) => s + (r.valueMgDl ?? 0), 0) / arr.length,
                )
              : null;
          results.push({ date: dateStr, avg });
        })
        .catch(() => results.push({ date: dateStr, avg: null }));
    }),
  );

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
