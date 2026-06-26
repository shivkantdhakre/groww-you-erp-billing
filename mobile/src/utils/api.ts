import axios from 'axios';
import * as SecureStore from './secureStoreWrapper';

import { Platform } from 'react-native';

const getBaseURL = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && envUrl && envUrl.includes('10.0.2.2')) {
    return envUrl.replace('10.0.2.2', 'localhost');
  }
  return envUrl || 'https://groww-you-erp-billing.onrender.com/api';
};

// Lazy store accessor to avoid circular dependency (useStore → api → useStore)
function getStore() {
  return require('../store/useStore').useStore;
}

// Custom Axios client for mobile API requests
const api = axios.create({
  baseURL: getBaseURL(),
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
      const selectedBranchId = getStore().getState().selectedBranchId;
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

import * as LocalAuthentication from 'expo-local-authentication';

interface FailedRequest {
  config: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

let isReauthenticating = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.config.headers = {
        ...prom.config.headers,
        'Authorization': `Bearer ${token}`
      };
      prom.resolve(api(prom.config));
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catch 401 Unauthorized errors and perform biometric re-auth
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isReauthenticating) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ config: originalRequest, resolve, reject });
        });
      }

      originalRequest._retry = true;
      isReauthenticating = true;

      return new Promise(async (resolve, reject) => {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          const savedEmail = await SecureStore.getItemAsync('saved_email');
          const savedPassword = await SecureStore.getItemAsync('saved_password');
          const savedOptIn = await SecureStore.getItemAsync('biometric_opt_in');

          if (hasHardware && isEnrolled && savedEmail && savedPassword && savedOptIn === 'true') {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Session expired. Please authenticate to renew login.',
              fallbackLabel: 'Enter Password'
            });

            if (authResult.success) {
              try {
                const loginRes = await axios.post(`${api.defaults.baseURL}/auth/login`, {
                  email: savedEmail,
                  password: savedPassword
                });

                const { token, user } = loginRes.data;
                if (token) {
                  await getStore().getState().setToken(token);
                  getStore().getState().setUser(user);
                  getStore().getState().setManualLogout(false);
                  getStore().getState().setOffline(false);

                  originalRequest.headers = {
                    ...originalRequest.headers,
                    'Authorization': `Bearer ${token}`
                  };

                  processQueue(null, token);
                  resolve(api(originalRequest));
                  return;
                }
              } catch (refreshErr: any) {
                console.error('Background token refresh failed:', refreshErr);
                if (!refreshErr.response || refreshErr.code === 'ERR_NETWORK') {
                  getStore().getState().setOffline(true);
                  processQueue(refreshErr, null);
                  reject(refreshErr);
                  return;
                }
              }
            }
          }
        } catch (biometricErr) {
          console.error('Biometric re-authentication logic failed:', biometricErr);
        }

        console.warn('Session expired or unauthorized. Logging out.');
        try {
          await getStore().getState().logout();
        } catch (logoutErr) {
          console.error('Error logging out during 401 interception:', logoutErr);
        }

        const rejectError = new Error('Session expired');
        processQueue(rejectError, null);
        reject(rejectError);
      }).finally(() => {
        isReauthenticating = false;
      });
    }

    return Promise.reject(error);
  }
);

export default api;
