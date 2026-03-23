import api from "./api";

/**
 * Returns today's meals (list) already enriched with totalCarbsG per meal.
 * We sum them client-side for the daily carb total.
 */
export async function getTodayMeals() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return api.get("/meals/by-date", { params: { date: today } });
}

/**
 * Returns glucose readings for a specific date.
 */
export async function getGlucoseByDate(localDateStr) {
  return api.get("/glucose-readings/by-date", {
    params: { date: localDateStr },
  });
}

/**
 * Fetches glucose readings for the last `days` days.
 * Returns an array of { date: "YYYY-MM-DD", avg: number | null }
 */
export async function getGlucoseTrend(days = 7) {
  const results = [];
  const today = new Date();

  await Promise.allSettled(
    Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);

      return api
        .get("/glucose-readings/by-date", { params: { date: dateStr } })
        .then((readings) => {
          const avg =
            readings && readings.length > 0
              ? Math.round(
                  readings.reduce((s, r) => s + (r.valueMgDl ?? 0), 0) /
                    readings.length,
                )
              : null;
          results.push({ date: dateStr, avg });
        });
    }),
  );

  // Sort chronologically
  return results.sort((a, b) => a.date.localeCompare(b.date));
}
