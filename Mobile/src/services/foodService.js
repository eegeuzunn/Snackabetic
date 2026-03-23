import api from "./api";

/**
 * GET /foods/search?query=...
 * Returns paginated FoodResponse list.
 * We fetch page 0 with size 20 and return the content array directly.
 */
export async function searchFoods(query) {
  const data = await api.get("/foods/search", {
    params: { query, page: 0, size: 20 },
  });
  // data is already unwrapped by the api interceptor (Page<FoodResponse>)
  return data?.content ?? [];
}
