import axios from "axios";
import { clearToken, getToken } from "./authStorage";
import { API_BASE_URL } from "../constants/config";

// ─── Config ────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach Bearer token ──────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: unwrap envelope + handle 401 ───────────────────
// All 2xx responses from the backend are wrapped as { success, message, data }.
// We unwrap the `data` field so callers work with plain objects.
// On 401 we clear the stored token; the auth state listener in useAuth will
// react and redirect the user to the Login screen.
let _onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  _onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => {
    // Unwrap ApiResponse<T> envelope when present
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken();
      if (_onUnauthorized) {
        _onUnauthorized();
      }
    }
    // Surface a clean error message from the backend when available
    const message =
      error.response?.data?.message ||
      error.message ||
      "Bir hata oluştu.";
    return Promise.reject(new Error(message));
  },
);

export default api;
