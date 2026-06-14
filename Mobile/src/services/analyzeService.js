import * as ImageManipulator from "expo-image-manipulator";
import {
  AI_SERVICE_URL,
  CAMERA_HEIGHT_CM,
  PLATE_DIAMETER_CM,
} from "../constants/config";

const HEIC_EXTENSIONS = [".heic", ".heif"];

export const FOOD_NOT_DETECTED_CODE = "FOOD_NOT_DETECTED";

export class FoodNotDetectedError extends Error {
  constructor(message = "Yemek algılanamadı. Lütfen tabaktaki yemeği net şekilde çekin.") {
    super(message);
    this.name = "FoodNotDetectedError";
    this.code = FOOD_NOT_DETECTED_CODE;
  }
}

function isHeicUri(uri) {
  if (!uri) return false;
  const lower = uri.split("?")[0].toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

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
  // HEIC/HEIF dahil tüm formatları JPEG'e dönüştür (ImageManipulator destekliyorsa)
  const normalized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1600 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (!normalized?.uri) {
    throw new Error(
      isHeicUri(imageUri)
        ? "HEIC fotoğraf dönüştürülemedi. Lütfen JPEG olarak kaydedip tekrar deneyin."
        : "Fotoğraf işlenemedi.",
    );
  }

  const uploadUri = normalized.uri;
  const filename = "snackabetic-photo.jpg";

  const formData = new FormData();
  formData.append("image", {
    uri: uploadUri,
    name: filename,
    type: "image/jpeg",
  });
  formData.append("plate_diameter_cm", String(PLATE_DIAMETER_CM));
  formData.append("camera_height_cm", String(CAMERA_HEIGHT_CM));

  let response;
  try {
    response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch (networkError) {
    throw new Error(
      `AI servisine ulaşılamadı (${AI_SERVICE_URL}). Servisin çalıştığından emin olun.`,
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

  if (json.food_detected === false) {
    throw new FoodNotDetectedError();
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
    top5: (json.top5 ?? []).map((item) => ({
      foodName: item.food_name ?? item.foodName ?? "",
      confidence: Number(item.confidence ?? 0),
      weightGEstimated: Number(
        item.weight_g_estimated ?? item.weightGEstimated ?? 0,
      ),
      caloriesEstimated: Number(
        item.calories_estimated ?? item.caloriesEstimated ?? 0,
      ),
      carbsGEstimated: Number(
        item.carbs_g_estimated ?? item.carbsGEstimated ?? 0,
      ),
      proteinGEstimated: Number(
        item.protein_g_estimated ?? item.proteinGEstimated ?? 0,
      ),
      fatGEstimated: Number(item.fat_g_estimated ?? item.fatGEstimated ?? 0),
    })),
  };
}
