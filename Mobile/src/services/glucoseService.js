import api from "./api";

/**
 * POST /glucose-readings
 * @param {number} valueMgDl   - Blood glucose value in mg/dL
 * @param {string} [notes]     - Optional free-text note
 */
export async function createGlucoseReading({ valueMgDl, notes = "" }) {
  return api.post("/glucose-readings", {
    readingTime: new Date().toISOString().slice(0, 19),
    valueMgDl: Math.round(valueMgDl),
    source: "MANUAL",
    notes,
  });
}

/**
 * GET /glucose-readings/by-date?date=YYYY-MM-DD
 */
export async function getGlucoseByDate(localDate) {
  return api.get("/glucose-readings/by-date", { params: { date: localDate } });
}
