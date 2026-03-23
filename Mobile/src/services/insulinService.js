import api from "./api";

/**
 * POST /insulin-doses
 * @param {number} units          - Insulin dose in units
 * @param {string} [insulinType]  - e.g. "RAPID", "LONG", "MIXED"
 * @param {string} [notes]        - Optional free-text medication/note
 */
export async function createInsulinDose({
  units,
  insulinType = "RAPID",
  notes = "",
}) {
  return api.post("/insulin-doses", {
    doseTime: new Date().toISOString().slice(0, 19),
    units,
    insulinType,
    notes,
  });
}

/**
 * GET /insulin-doses/by-date?date=YYYY-MM-DD
 */
export async function getInsulinByDate(localDate) {
  return api.get("/insulin-doses/by-date", { params: { date: localDate } });
}
