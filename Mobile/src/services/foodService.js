import api from "./api";

export async function searchFoods(query) {
  const data = await api.get("/foods/search", {
    params: { query, page: 0, size: 20 },
  });
  return data?.content ?? [];
}

export async function getFoods(page = 0, size = 30) {
  const data = await api.get("/foods", {
    params: { page, size },
  });
  return data?.content ?? [];
}
