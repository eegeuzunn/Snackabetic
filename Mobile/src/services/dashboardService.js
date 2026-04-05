import api from "./api";
import { getMyProfile } from "./patientService";

/**
 * Fetches all data needed for the Dashboard screen in parallel:
 *   - today's meals      (→ carb total, calorie total, meal count)
 *   - today's insulin    (→ total units)
 *   - patient profile    (→ carb/glucose targets)
 *   - glucose trend for last `days` days
 *   - today's glucose daily-stats (min/max/avg)
 */
export async function getDashboardData(days = 7) {
  const today = new Date().toISOString().slice(0, 10);

  const [mealsResult, insulinResult, profileResult, statsResult, trendPoints, recentMealsResult] =
    await Promise.all([
      api.get("/meals/by-date", { params: { date: today } }).catch(() => []),
      api.get("/insulin-doses/by-date", { params: { date: today } }).catch(() => []),
      getMyProfile().catch(() => null),
      api.get("/glucose-readings/daily-stats", { params: { date: today } }).catch(() => null),
      buildGlucoseTrend(days),
      api.get("/meals", { params: { page: 0, size: 5, sort: "mealTime,desc" } }).catch(() => null),
    ]);

  const meals = Array.isArray(mealsResult) ? mealsResult : [];
  const totalCarbsG =
    Math.round(meals.reduce((s, m) => s + (parseFloat(m.totalCarbsG) || 0), 0) * 10) / 10;
  const totalCalories =
    Math.round(meals.reduce((s, m) => s + (parseFloat(m.totalCalories) || 0), 0));
  const mealCount = meals.length;

  const doses = Array.isArray(insulinResult) ? insulinResult : [];
  const totalInsulinUnits =
    Math.round(doses.reduce((s, d) => s + (parseFloat(d.units) || 0), 0) * 10) / 10;

  const recentMeals = recentMealsResult?.content ?? (Array.isArray(recentMealsResult) ? recentMealsResult : []);

  return {
    totalCarbsG,
    totalCalories,
    mealCount,
    totalInsulinUnits,
    profile: profileResult,
    dailyStats: statsResult,
    glucoseTrend: trendPoints,
    recentMeals,
  };
}

/** Fetches glucose by-date for each day and returns avg per day */
async function buildGlucoseTrend(days) {
  const base = new Date();

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });

  const settled = await Promise.allSettled(
    dates.map((dateStr) =>
      api.get("/glucose-readings/by-date", { params: { date: dateStr } })
    )
  );

  return dates.map((dateStr, i) => {
    const result = settled[i];
    if (result.status !== "fulfilled") return { date: dateStr, avg: null };
    const arr = Array.isArray(result.value) ? result.value : [];
    const avg =
      arr.length > 0
        ? Math.round(arr.reduce((s, r) => s + (r.valueMgDl ?? 0), 0) / arr.length)
        : null;
    return { date: dateStr, avg };
  });
}
