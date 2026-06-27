import axios from 'axios';
import * as SecureStore from './secureStoreWrapper';
import { Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { showToast } from '../components/ui/toast';

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. Global Network Timeouts & Dropouts
    if (error.code === 'ECONNABORTED') {
      showToast({ message: 'Connection timed out. Please check your network.', type: 'error' });
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      showToast({ message: 'No internet connection.', type: 'error' });
    }

    // 2. 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out.');
      showToast({ message: 'Session expired. Please log in again.', type: 'warning' });
      try {
        await useStore.getState().logout();
      } catch (logoutErr) {
        console.error('Error logging out during 401 interception:', logoutErr);
      }
    }
    
    // STRICT REJECTION RULE: Never resolve failed promises globally.
    // This allows the calling component's catch() block to fire safely.
    return Promise.reject(error);
  }
);

export default api;
