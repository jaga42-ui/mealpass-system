import axios from "axios";

// Create an Axios instance pointing strictly to your live Render backend
const api = axios.create({
  // 🚀 THE FIX: Hardcoded to your live server
  baseURL: "https://mealpass-system.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach the token before every request
api.interceptors.request.use(
  (config) => {
    // Keeping your original 'mealpass_token' so your login doesn't break!
    const token = localStorage.getItem("mealpass_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Kick the user out if their token expires
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("mealpass_token");
      localStorage.removeItem("mealpass_user");

      // Redirect to login if unauthorized
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
