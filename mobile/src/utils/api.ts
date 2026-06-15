import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useStore } from '../store/useStore';

// Custom Axios client for mobile API requests
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://groww-you-erp-api.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Retrieve JWT from SecureStore and inject into headers
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to read auth token from SecureStore:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 Unauthorized errors and force clear local session
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out.');
      try {
        // Trigger Zustand store logout to clear secure keychain and local storage
        await useStore.getState().logout();
      } catch (logoutErr) {
        console.error('Error logging out during 401 interception:', logoutErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
