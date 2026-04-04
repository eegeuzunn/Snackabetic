import { AI_SERVICE_URL } from "../constants/config";

/**
 * POST {AI_SERVICE_URL}/analyze
 *
 * AI service response shape:
 * {
 *   top_prediction: { food_name, weight_g, carbs_g, calories, protein_g, fat_g, confidence, volume_ml },
 *   top5: [...],
 *   confidence_level: "high" | "medium" | "low",
 *   ...
 * }
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

  let response;
  try {
    response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch (networkError) {
    throw new Error(
      `AI servisine ulaşılamadı (${AI_SERVICE_URL}). Servisin çalıştığından emin olun.`
    );
  }

  const text = await response.text();

  if (!response.ok) {
    let detail = "";
    try {
      const err = JSON.parse(text);
      detail = err.error || err.message || text;
    } catch {
      detail = text;
    }
    throw new Error(`Analiz başarısız (HTTP ${response.status}): ${detail}`);
  }

  const json = JSON.parse(text);
  const top = json?.top_prediction ?? null;

  if (!top) {
    throw new Error("AI servisi tahmin döndürmedi.");
  }

  return {
    foodName: top.food_name ?? "Bilinmiyor",
    weightG: Number(top.weight_g ?? 0),
    carbsG: Number(top.carbs_g ?? 0),
    calories: Number(top.calories ?? 0),
    proteinG: Number(top.protein_g ?? 0),
    fatG: Number(top.fat_g ?? 0),
    confidence: Number(top.confidence ?? 0),
    confidenceLevel: json.confidence_level ?? "low",
    top5: json.top5 ?? [],
  };
}
