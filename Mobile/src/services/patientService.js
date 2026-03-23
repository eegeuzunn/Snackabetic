import api from "./api";

/**
 * GET /api/v1/patient-profile/me
 * Returns the logged-in user's patient profile including glucose targets,
 * carb ratio, diabetes type, etc.
 */
export async function getMyProfile() {
  return api.get("/api/v1/patient-profile/me");
}
