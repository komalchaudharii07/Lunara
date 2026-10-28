// In production the API address MUST be set at build time (VITE_API_URL).
// Falling back to localhost there would make every call fail silently.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "")
).replace(/\/+$/, ""); // no trailing slash, so paths never become //auth/login

if (!API_URL) {
  throw new Error("VITE_API_URL is not set. Add it to your production build.");
}

const DEFAULT_TIMEOUT_MS = 30000;
const SESSION_EXPIRED_KEY = "lunara_session_expired";

export const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

// true when "remember me" was chosen (the token lives in localStorage)
export const isRemembered = () => !!localStorage.getItem("token");

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
  {
    method = "GET",
    body,
    auth = true,
    timeout = body instanceof FormData ? 60000 : DEFAULT_TIMEOUT_MS,
    logoutOn401 = auth, // a wrong-password 401 must not end the session
  } = {}
) {
  const headers = {};
  // file uploads: the browser sets the multipart header itself
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isForm) {
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
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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
    if (response.status === 401 && logoutOn401) {
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
  request("/auth/change-password", {
    method: "PUT",
    body: passwordData,
    logoutOn401: false,
  });

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

// PRIVATE FILES: they are only available to logged-in people who are allowed to see them.
// The browser can't send a login header from an <img> or a link, so the file is fetched here.
export const fetchFileBlob = async (fileId, { download = false } = {}) => {
  const token = getToken();
  let response;
  try {
    response = await fetch(
      `${API_URL}/files/${encodeURIComponent(fileId)}${download ? "?download=1" : ""}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new Error(response.status === 404 ? "File not found." : "Couldn't open the file.");
  }
  return response.blob();
};

// saves a private file to the person's device
export const downloadFile = async (fileId, filename = "file") => {
  const blob = await fetchFileBlob(fileId, { download: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// opens a private PDF or picture in a new tab
export const openFile = async (fileId) => {
  const win = window.open("", "_blank");
  try {
    const blob = await fetchFileBlob(fileId);
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
};

// downloads a PDF (or any file) made by an API route, using the login
export const downloadFromApi = async (path, filename) => {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (!response.ok) throw new Error("Couldn't download the file.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const downloadPrescriptionPdf = (appointmentId) =>
  downloadFromApi(
    `/appointments/${encodeURIComponent(appointmentId)}/prescription/pdf`,
    "lunara-prescription.pdf"
  );

// medical reports (doctor uploads, patient reads)
export const uploadMedicalReport = ({ appointmentId, title, notes, file }) => {
  const form = new FormData();
  form.append("appointmentId", appointmentId);
  form.append("title", title);
  form.append("notes", notes || "");
  form.append("file", file);
  return request("/medical-reports", { method: "POST", body: form });
};

export const getAppointmentReports = (appointmentId) =>
  request(`/medical-reports/appointment/${encodeURIComponent(appointmentId)}`);

export const getMyReports = () => request("/medical-reports/mine");

export const deleteMedicalReport = (id) =>
  request(`/medical-reports/${encodeURIComponent(id)}`, { method: "DELETE" });

// doctor documents and photo
export const uploadDoctorPhoto = (file) => {
  const form = new FormData();
  form.append("photo", file);
  return request("/doctors/me/photo", { method: "PUT", body: form });
};

export const uploadDoctorDocuments = (files) => {
  const form = new FormData();
  [...files].forEach((f) => form.append("documents", f));
  return request("/doctors/me/documents", { method: "POST", body: form });
};

export const removeDoctorDocument = (fileId) =>
  request(`/doctors/me/documents/${encodeURIComponent(fileId)}`, { method: "DELETE" });

export const resubmitDoctor = () => request("/doctors/me/resubmit", { method: "POST" });

// registered doctors with a clinic near a point (for the Nearby map)
export const getNearbyDoctors = ({ lat, lng, km = 25 } = {}) =>
  lat === undefined || lng === undefined
    ? request("/doctors/nearby")
    : request(
        `/doctors/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&km=${encodeURIComponent(km)}`
      );

// a doctor's own profile
export const getMyDoctorProfile = () => request("/doctors/me/profile");

export const updateMyDoctorProfile = (profile) =>
  request("/doctors/me/profile", { method: "PUT", body: profile });

// admin: approve or reject doctors
export const getDoctorsForReview = (status = "pending") =>
  request(`/doctors/admin/review?status=${encodeURIComponent(status)}`);

export const reviewDoctor = (doctorId, decision, note = "") =>
  request(`/doctors/admin/${encodeURIComponent(doctorId)}/review`, {
    method: "PATCH",
    body: { decision, note },
  });

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
  request("/auth/me", {
    method: "DELETE",
    body: { password },
    logoutOn401: false,
  });

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

export const rescheduleAppointment = (id, startsAt) =>
  request(`/appointments/${encodeURIComponent(id)}/reschedule`, {
    method: "PATCH",
    body: { startsAt },
  });

export const bookAppointment = (body) =>
  request("/appointments", { method: "POST", body });

export const getMyAppointments = () => request("/appointments/mine");

// prescriptions: the doctor writes, the patient (and that doctor) reads
export const savePrescription = (appointmentId, data) =>
  request(`/appointments/${encodeURIComponent(appointmentId)}/prescription`, {
    method: "PUT",
    body: data,
  });

export const getPrescription = (appointmentId) =>
  request(`/appointments/${encodeURIComponent(appointmentId)}/prescription`);

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