import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Attach access token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ FIX: On 401, try refresh token first — only logout if refresh also fails.
// Previously it was logging out immediately on every 401 (e.g. expired access token)
// without ever attempting to get a new access token via the refresh token.

let _isRefreshing = false;          // prevent multiple simultaneous refresh calls
let _waitQueue    = [];             // requests waiting while refresh is in progress

function processQueue(error, token = null) {
  _waitQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _waitQueue = [];
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s, and don't retry the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh_token")
    ) {
      const refreshToken = localStorage.getItem("refresh_token");

      // No refresh token stored → logout immediately
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      // If already refreshing, queue this request until refresh completes
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _waitQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        // Call backend refresh endpoint: POST /auth/refresh_token?refresh_token=...
        const res = await axios.post(
          `http://localhost:8000/auth/refresh_token?refresh_token=${encodeURIComponent(refreshToken)}`
        );

        const newAccessToken = res.data?.access_token;
        if (!newAccessToken) throw new Error("No access token in refresh response");

        // Save new access token
        localStorage.setItem("access_token", newAccessToken);

        // Update default header and retry queued requests
        API.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        // Retry the original failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        // Refresh failed (expired or invalid) → full logout
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_email");
  window.location.href = "/";
}

export default API;