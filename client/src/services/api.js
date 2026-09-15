const API_URL = "http://localhost:5000/api";

// AUTH
export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data;
};

export const loginUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};

export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get user");
  }

  return data;
};

export const updateProfile = async (profileData, token) => {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Profile update failed");
  }

  return data;
};

// CYCLE
export const createCycle = async (cycleData, token) => {
  const response = await fetch(`${API_URL}/cycles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cycleData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to save cycle");
  }

  return data;
};

export const getCycles = async (token) => {
  const response = await fetch(`${API_URL}/cycles`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch cycles");
  }

  return data;
};

export const getLatestCycle = async (token) => {
  const response = await fetch(`${API_URL}/cycles/latest`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch latest cycle");
  }

  return data;
};

// AI
export const askLunaraAI = async (message, token) => {
  const response = await fetch(`${API_URL}/ai/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to get AI response"
    );
  }

  return data;
};
// CHAT HISTORY
export const getChatHistory = async (token) => {
  const response = await fetch(`${API_URL}/chats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch chat history"
    );
  }

  return data;
};
export const clearChatHistory = async (token) => {
  const response = await fetch(`${API_URL}/chats`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to clear chat history"
    );
  }

  return data;
};
export const changePassword = async (
  passwordData,
  token
) => {
  const response = await fetch(
    `${API_URL}/auth/change-password`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to change password"
    );
  }

  return data;
};
// COMMUNITY

export const getPosts = async (token) => {
  const response = await fetch(`${API_URL}/posts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch posts");
  }

  return data;
};

export const createPost = async (postData, token) => {
  const response = await fetch(`${API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create post");
  }

  return data;
};

export const togglePostLike = async (postId, token) => {
  const response = await fetch(
    `${API_URL}/posts/${postId}/like`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update like");
  }

  return data;
};
// DOCTORS

export const getDoctors = async (token) => {
  const response = await fetch(`${API_URL}/doctors`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch doctors");
  }

  return data;
};

export const getDoctor = async (doctorId, token) => {
  const response = await fetch(
    `${API_URL}/doctors/${doctorId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch doctor");
  }

  return data;
};
// REVIEWS

export const getDoctorReviews = async (
  doctorId,
  token
) => {
  const response = await fetch(
    `${API_URL}/reviews/doctor/${doctorId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch reviews"
    );
  }

  return data;
};

export const createDoctorReview = async (
  doctorId,
  reviewData,
  token
) => {
  const response = await fetch(
    `${API_URL}/reviews/doctor/${doctorId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to create review"
    );
  }

  return data;
};
export const clearCycleHistory = async (token) => {
  const response = await fetch(
    `${API_URL}/cycles`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Failed to clear cycle history"
    );
  }

  return data;
};