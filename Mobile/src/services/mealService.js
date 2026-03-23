import api from "./api";

/**
 * POST /meals
 * Saves the confirmed meal (with items) to the backend.
 *
 * @param {object} params
 * @param {number} params.foodId        - ID of the food from the Foods table
 * @param {number} params.amountGrams   - Weight in grams
 * @param {string} [params.mealType]    - e.g. "SNACK", "BREAKFAST", "LUNCH", "DINNER"
 * @param {string} [params.notes]       - Optional free-text note
 * @returns {Promise<MealResponse>}
 */
export async function createMeal({ foodId, amountGrams, mealType = "SNACK", notes = "" }) {
  return api.post("/meals", {
    mealTime: new Date().toISOString().slice(0, 19), // LocalDateTime format
    mealType,
    notes,
    items: [{ foodId, amountGrams }],
  });
}
