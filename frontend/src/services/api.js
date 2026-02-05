import axios from "axios";

const isDev = import.meta.env.DEV;

let apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Prevent mixed-content on HTTPS pages:
// - If someone accidentally sets VITE_API_BASE_URL to http:// in production, we upgrade to https://.
// - If it points to localhost/127.0.0.1 in production (common mistake when copying dev .env),
//   fall back to the same-origin reverse-proxied API.
if (!isDev && apiBaseUrl) {
  if (/^http:\/\//i.test(apiBaseUrl)) {
    apiBaseUrl = apiBaseUrl.replace(/^http:\/\//i, "https://");
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(apiBaseUrl)) {
    apiBaseUrl = "/api";
  }
}

const API_BASE_URL = apiBaseUrl || (isDev ? "http://localhost:8000" : "/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 AUTO ATTACH TOKEN
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;