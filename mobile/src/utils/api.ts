import axios from 'axios';
import * as SecureStore from './secureStoreWrapper';
import { Platform } from 'react-native';
import { useStore } from '../store/useStore';

const getBaseURL = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && envUrl && envUrl.includes('10.0.2.2')) {
    return envUrl.replace('10.0.2.2', 'localhost');
  }
  return envUrl || 'https://groww-you-erp-billing.onrender.com/api';
};


// Custom Axios client for mobile API requests
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Retrieve JWT from SecureStore and inject into headers, alongside x-branch-id
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const selectedBranchId = useStore.getState().selectedBranchId;
      if (selectedBranchId) {
        config.headers['x-branch-id'] = selectedBranchId.toString();
      }
    } catch (e) {
      console.error('Failed to read auth token or branch info:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 Unauthorized errors and force logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out.');
      try {
        await useStore.getState().logout();
      } catch (logoutErr) {
        console.error('Error logging out during 401 interception:', logoutErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
