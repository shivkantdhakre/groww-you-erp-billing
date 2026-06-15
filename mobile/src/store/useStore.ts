import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

interface StoreState {
  token: string | null;
  user: any | null;
  items: any[];
  summary: any | null;
  loading: boolean;
  manualLogout: boolean;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: any | null) => void;
  setItems: (items: any[]) => void;
  setSummary: (summary: any | null) => void;
  setManualLogout: (val: boolean) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchSummary: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      items: [],
      summary: null,
      loading: false,
      manualLogout: false,

      setToken: async (token) => {
        if (token) {
          await SecureStore.setItemAsync('token', token);
        } else {
          await SecureStore.deleteItemAsync('token');
        }
        set({ token });
      },

      setUser: (user) => set({ user }),
      setItems: (items) => set({ items }),
      setSummary: (summary) => set({ summary }),
      setManualLogout: (manualLogout) => set({ manualLogout }),

      initializeAuth: async () => {
        try {
          const token = await SecureStore.getItemAsync('token');
          set({ token });
        } catch (e) {
          console.error("Error reading token from SecureStore:", e);
        }
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, user } = res.data;
          await get().setToken(token);
          set({ user, manualLogout: false });
        } catch (err: any) {
          throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || "Login failed");
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        await get().setToken(null);
        set({ user: null, summary: null, manualLogout: true });
      },

      fetchItems: async () => {
        try {
          const res = await api.get('/masters/items?limit=1000');
          // Handle standard backend envelope format
          const itemsData = res.data.data || res.data;
          set({ items: itemsData });
        } catch (err: any) {
          console.error("Failed to fetch items from API:", err);
        }
      },

      fetchSummary: async () => {
        try {
          const res = await api.get('/reports/summary');
          set({ summary: res.data });
        } catch (err: any) {
          console.error("Failed to fetch summary from API:", err);
        }
      }
    }),
    {
      name: 'groww-you-erp-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist dashboard summary, user, and items cache for offline access
      partialize: (state) => ({
        user: state.user,
        items: state.items,
        summary: state.summary,
        manualLogout: state.manualLogout,
      }),
    }
  )
);
