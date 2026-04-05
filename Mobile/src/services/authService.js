import api from "./api";

const AUTH_BASE = "/api/v1/auth";

/**
 * POST /api/v1/auth/login
 * Returns AuthResponse { token, user }
 */
export async function login(email, password) {
  return api.post(`${AUTH_BASE}/login`, { email, password });
}

/**
 * POST /api/v1/auth/register
 * Returns AuthResponse { token, user }
 */
export async function register(email, password, firstName, lastName, phone) {
  return api.post(`${AUTH_BASE}/register`, {
    email,
    password,
    firstName,
    lastName,
    phone,
  });
}

export async function me() {
  return api.get(`${AUTH_BASE}/me`);
}

export async function updateMe(data) {
  return api.put(`${AUTH_BASE}/me`, data);
}
