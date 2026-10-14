// In production the API address MUST be set at build time (VITE_API_URL).
// Falling back to localhost there would make every call fail silently.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "");

if (!API_URL) {
  throw new Error("VITE_API_URL is not set. Add it to your production build.");
}

const DEFAULT_TIMEOUT_MS = 30000;
const SESSION_EXPIRED_KEY = "lunara_session_expired";

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

// Today's date in the USER's time zone as YYYY-MM-DD
export const localDateKey = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Single place for every API call
async function request(
  path,
  { method = "GET", body, auth = true, timeout = DEFAULT_TIMEOUT_MS } = {}
) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  let data = {};

  try {
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        err.name === "AbortError"
          ? "The request took too long. Please try again."
          : "Cannot reach the server. Check your connection and try again."
      );
    }

    // The server may return non-JSON (proxy error pages, etc.)
    try {
      data = await response.json();
    } catch {
      /* ignore */
    }
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Expired or invalid session on a protected call: log out once
    if (response.status === 401 && auth) {
      clearToken();
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      } catch {
        /* ignore */
      }
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    let fallback = "Something went wrong.";
    if (response.status === 429) {
      fallback = "Too many requests. Please wait a moment and try again.";
    } else if (response.status >= 500) {
      fallback = "Server error. Please try again later.";
    }

    const error = new Error(data.message || fallback);
    error.status = response.status;
    error.errors = data.errors; // field-level errors, if the server sends them
    error.code = data.code; // machine-readable reason, e.g. AI_CONSENT_REQUIRED
    throw error;
  }

  return data;
}

// Login page: was the user sent here because the session ended?
export const consumeSessionExpired = () => {
  try {
    const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return expired;
  } catch {
    return false;
  }
};

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

export const updateCycle = (id, body) =>
  request(`/cycles/${encodeURIComponent(id)}`, { method: "PATCH", body });

export const deleteCycle = (id) =>
  request(`/cycles/${encodeURIComponent(id)}`, { method: "DELETE" });

// DAILY LOGS (date is YYYY-MM-DD)
export const getDailyLogs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/logs${query ? `?${query}` : ""}`);
};

export const saveDailyLog = (date, body) =>
  request(`/logs/${encodeURIComponent(date)}`, { method: "PUT", body });

export const deleteDailyLog = (date) =>
  request(`/logs/${encodeURIComponent(date)}`, { method: "DELETE" });

export const clearDailyLogs = () => request("/logs", { method: "DELETE" });

// the server uses our local date so "today" is right in every time zone
export const getCycleSummary = () =>
  request(`/cycles/summary?today=${localDateKey()}`);

// AI AND CHAT
export const askLunaraAI = (message) =>
  request("/ai/ask", { method: "POST", body: { message }, timeout: 60000 });

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
  request(`/posts/${encodeURIComponent(postId)}/like`, { method: "PUT" });

export const deletePost = (postId) =>
  request(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });

export const reportPost = (postId, reason) =>
  request(`/posts/${encodeURIComponent(postId)}/report`, {
    method: "POST",
    body: { reason },
  });

// DOCTORS AND REVIEWS
export const getDoctors = () => request("/doctors");

export const getDoctor = (doctorId) =>
  request(`/doctors/${encodeURIComponent(doctorId)}`);

export const getDoctorReviews = (doctorId) =>
  request(`/reviews/doctor/${encodeURIComponent(doctorId)}`);

export const createDoctorReview = (doctorId, reviewData) =>
  request(`/reviews/doctor/${encodeURIComponent(doctorId)}`, {
    method: "POST",
    body: reviewData,
  });

// PASSWORD RESET AND CONTACT (public)
export const forgotPassword = (email) =>
  request("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });

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

// PRIVACY AND ACCOUNT
export const setAiConsent = (consent) =>
  request("/auth/ai-consent", { method: "PUT", body: { consent } });

export const logoutOtherDevices = () =>
  request("/auth/logout-all", { method: "POST" });

export const exportMyData = () => request("/auth/export", { timeout: 60000 });


// APPOINTMENTS
export const getAppointmentSlots = (doctorId, date) =>
  request(
    `/appointments/slots/${encodeURIComponent(doctorId)}?date=${encodeURIComponent(date)}`
  );

export const bookAppointment = (body) =>
  request("/appointments", { method: "POST", body });

export const getMyAppointments = () => request("/appointments/mine");

export const cancelAppointment = (id) =>
  request(`/appointments/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });

export const setAppointmentSharing = (id, shareReport) =>
  request(`/appointments/${encodeURIComponent(id)}/share`, {
    method: "PATCH",
    body: { shareReport },
  });

// doctor side (the server checks that you are that doctor, or an admin)
export const getDoctorSchedule = (doctorId) =>
  request(`/appointments/schedule/${encodeURIComponent(doctorId)}`);

export const saveDoctorSchedule = (doctorId, body) =>
  request(`/appointments/schedule/${encodeURIComponent(doctorId)}`, {
    method: "PUT",
    body,
  });

export const getDoctorAppointments = (doctorId, scope = "upcoming") =>
  request(
    `/appointments/doctor/${encodeURIComponent(doctorId)}?scope=${encodeURIComponent(scope)}`
  );

export const updateAppointmentByDoctor = (id, body) =>
  request(`/appointments/${encodeURIComponent(id)}/doctor`, {
    method: "PATCH",
    body,
  });

export const getSharedReport = (id) =>
  request(`/appointments/${encodeURIComponent(id)}/report`);

// REPORT (from and to are YYYY-MM-DD)
export const getReport = ({ from, to } = {}) => {
  const params = new URLSearchParams({ today: localDateKey() });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request(`/reports?${params.toString()}`, { timeout: 60000 });
};


// PAYMENTS (Razorpay)
export const getPaymentConfig = () => request("/payments/config");

export const verifyPayment = (body) =>
  request("/payments/verify", { method: "POST", body });

// reopens the payment window for a booking that is still waiting for payment
export const getCheckout = (appointmentId) =>
  request(`/payments/checkout/${encodeURIComponent(appointmentId)}`);