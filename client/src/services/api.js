const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export const clearToken = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
};

export const saveToken = (token, remember = true) => {
  clearToken(); // never leave a stale token in the other storage
  (remember ? localStorage : sessionStorage).setItem("token", token);
};

// Single place for every API call
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your connection and try again."
    );
  }

  // The server may return non-JSON (proxy error pages, etc.)
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    // Expired or invalid session on a protected call: log out once
    if (response.status === 401 && auth) {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    const error = new Error(
      data.message ||
        (response.status >= 500
          ? "Server error. Please try again later."
          : "Something went wrong.")
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

// AUTH (login and register are not authenticated calls)
export const registerUser = (userData) =>
  request("/auth/register", { method: "POST", body: userData, auth: false });

export const loginUser = (userData) =>
  request("/auth/login", { method: "POST", body: userData, auth: false });

export const getCurrentUser = () => request("/auth/me");

export const updateProfile = (profileData) =>
  request("/auth/profile", { method: "PUT", body: profileData });

export const changePassword = (passwordData) =>
  request("/auth/change-password", { method: "PUT", body: passwordData });

// CYCLES
export const createCycle = (cycleData) =>
  request("/cycles", { method: "POST", body: cycleData });

export const getCycles = () => request("/cycles");

export const getLatestCycle = () => request("/cycles/latest");

export const clearCycleHistory = () =>
  request("/cycles", { method: "DELETE" });

// AI AND CHAT
export const askLunaraAI = (message) =>
  request("/ai/ask", { method: "POST", body: { message } });

export const getChatHistory = () => request("/chats");

export const clearChatHistory = () =>
  request("/chats", { method: "DELETE" });

// COMMUNITY
export const getPosts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/posts${query ? `?${query}` : ""}`);
};

export const createPost = (postData) =>
  request("/posts", { method: "POST", body: postData });

export const togglePostLike = (postId) =>
  request(`/posts/${postId}/like`, { method: "PUT" });

// DOCTORS AND REVIEWS
export const getDoctors = () => request("/doctors");

export const getDoctor = (doctorId) => request(`/doctors/${doctorId}`);

export const getDoctorReviews = (doctorId) =>
  request(`/reviews/doctor/${doctorId}`);

export const createDoctorReview = (doctorId, reviewData) =>
  request(`/reviews/doctor/${doctorId}`, { method: "POST", body: reviewData });

// PASSWORD RESET AND CONTACT (public)
export const forgotPassword = (email) =>
  request("/auth/forgot-password", { method: "POST", body: { email }, auth: false });

export const resetPassword = (token, password) =>
  request(`/auth/reset-password/${encodeURIComponent(token)}`, {
    method: "POST",
    body: { password },
    auth: false,
  });

export const sendContactMessage = (data) =>
  request("/contact", { method: "POST", body: data, auth: false });

export const deleteAccount = (password) =>
  request("/auth/me", { method: "DELETE", body: { password } });

export const getCycleSummary = () => request("/cycles/summary");