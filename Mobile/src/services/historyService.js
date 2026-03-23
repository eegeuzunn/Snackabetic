import api from "./api";

/**
 * Fetches meals (page 0, size 50) and glucose readings (page 0, size 50)
 * in parallel, then merges and sorts them newest-first.
 *
 * Each item in the result has a `type` field: "MEAL" | "GLUCOSE" | "INSULIN"
 */
export async function getHistory() {
  const [mealsResult, glucoseResult, insulinResult] = await Promise.allSettled([
    api.get("/meals", { params: { page: 0, size: 50 } }),
    api.get("/glucose-readings", { params: { page: 0, size: 50 } }),
    api.get("/insulin-doses", { params: { page: 0, size: 50 } }),
  ]);

  const meals = (mealsResult.status === "fulfilled"
    ? mealsResult.value?.content ?? []
    : []
  ).map((m) => ({
    type: "MEAL",
    id: `meal-${m.id}`,
    timestamp: m.mealTime,
    foodName: m.mealType,
    totalCarbsG: m.totalCarbsG,
    totalCalories: m.totalCalories,
    // Flatten first item's carbs if available
    items: m.items ?? [],
  }));

  const glucose = (glucoseResult.status === "fulfilled"
    ? glucoseResult.value?.content ?? []
    : []
  ).map((g) => ({
    type: "GLUCOSE",
    id: `glucose-${g.id}`,
    timestamp: g.readingTime,
    valueMgDl: g.valueMgDl,
    notes: g.notes,
  }));

  const insulin = (insulinResult.status === "fulfilled"
    ? insulinResult.value?.content ?? []
    : []
  ).map((i) => ({
    type: "INSULIN",
    id: `insulin-${i.id}`,
    timestamp: i.doseTime,
    units: i.units,
    insulinType: i.insulinType,
    notes: i.notes,
  }));

  // Merge and sort newest first
  return [...meals, ...glucose, ...insulin].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );
}
