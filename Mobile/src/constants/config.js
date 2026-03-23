/**
 * Spring Boot backend base URL.
 * - Simulator    : "http://localhost:8080"
 * - Physical device: use your machine's local IP, e.g. "http://192.168.1.42:8080"
 */
export const API_BASE_URL = "http://localhost:8080";

/**
 * Python AI service base URL (snackabetic_service.py — port 5001).
 * - Simulator    : "http://localhost:5001"
 * - Physical device: same IP as above but port 5001, e.g. "http://192.168.1.42:5001"
 */
export const AI_SERVICE_URL = "http://localhost:5001";
