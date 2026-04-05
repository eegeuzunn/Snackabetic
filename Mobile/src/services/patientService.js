import api from "./api";

export async function getMyProfile() {
  return api.get("/api/v1/patient-profile/me");
}

export async function updateMyProfile(data) {
  return api.put("/api/v1/patient-profile/me", data);
}
