import axios from 'axios';

// Create a central Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// The Interceptor: Automatically attach the token before sending any request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const activeBranchId = localStorage.getItem('activeBranchId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeBranchId) {
      config.headers['x-branch-id'] = activeBranchId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global Error Handler: If the token expires, log the user out
let logoutHandler = null;

export const registerLogoutHandler = (handler) => {
  logoutHandler = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isGstnSessionExpired =
      error.response?.data?.error === "GSTN_SESSION_EXPIRED";

    if (error.response && error.response.status === 401 && !isGstnSessionExpired) {
      console.error('Session expired. Please log in again.');
      if (logoutHandler) {
        logoutHandler();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Force redirect back to login screen
        window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default api;
