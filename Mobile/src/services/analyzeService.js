import { AI_SERVICE_URL } from "../constants/config";

/**
 * POST {AI_SERVICE_URL}/analyze
 *
 * Python service (snackabetic_service.py) response shape:
 * {
 *   predictions: [
 *     { food_name, weight_g, carbs_g, calories },
 *     ...
 *   ]
 * }
 *
 * @param {string} imageUri - Local file URI from expo-camera / expo-image-picker
 * @returns {Promise<{ foodName: string, weightG: number, carbsG: number, calories: number }>}
 */
export async function analyzeImage(imageUri) {
  const filename = imageUri.split("/").pop();
  const ext = filename.split(".").pop().toLowerCase();
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  });

  // Python service doesn't require JWT — no Authorization header needed
  const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
    method: "POST",
    // Do NOT set Content-Type manually; fetch sets it with the correct multipart boundary
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Analiz başarısız (HTTP ${response.status})`);
  }

  const json = await response.json();
  const top = json?.predictions?.[0] ?? null;

  if (!top) {
    throw new Error("AI servisi tahmin döndürmedi.");
  }

  return {
    foodName: top.food_name ?? "Bilinmiyor",
    weightG: Number(top.weight_g ?? 0),
    carbsG: Number(top.carbs_g ?? 0),
    calories: Number(top.calories ?? 0),
  };
}
