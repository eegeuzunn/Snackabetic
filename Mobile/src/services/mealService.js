import api from "./api";

/**
 * POST /meals
 * Creates a meal with one or more items.
 *
 * @param {object} params
 * @param {Array<{foodId: number, amountGrams: number}>} params.items
 * @param {string} [params.mealType]  "SNACK" | "BREAKFAST" | "LUNCH" | "DINNER"
 * @param {string} [params.notes]
 */
export async function createMeal({ items, mealType = "SNACK", notes = "" }) {
  return api.post("/meals", {
    mealTime: new Date().toISOString().slice(0, 19),
    mealType,
    notes,
    items: items.map(({ foodId, amountGrams }) => ({ foodId, amountGrams })),
  });
}

export async function getMealById(id) {
  if (!id) return null;
  return api.get(`/meals/${id}`);
}
