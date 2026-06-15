import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

interface StoreState {
  token: string | null;
  user: any | null;
  items: any[];
  invoices: any[];
  summary: any | null;
  loading: boolean;
  manualLogout: boolean;
  isOffline: boolean;
  lastSyncedAt: string | null;
  hasHydrated: boolean;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: any | null) => void;
  setItems: (items: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setSummary: (summary: any | null) => void;
  setManualLogout: (val: boolean) => void;
  setOffline: (val: boolean) => void;
  setLastSyncedAt: (val: string | null) => void;
  setHasHydrated: (val: boolean) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  upsertCachedItem: (item: any) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      items: [],
      invoices: [],
      summary: null,
      loading: false,
      manualLogout: false,
      isOffline: false,
      lastSyncedAt: null,
      hasHydrated: false,

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
      setInvoices: (invoices) => set({ invoices }),
      setSummary: (summary) => set({ summary }),
      setManualLogout: (manualLogout) => set({ manualLogout }),
      setOffline: (isOffline) => set({ isOffline }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      upsertCachedItem: (item) => {
        set((state) => {
          const index = state.items.findIndex((i: any) => i.id === item.id || i.sku === item.sku);
          const newItems = [...state.items];
          if (index > -1) {
            newItems[index] = item;
          } else {
            newItems.unshift(item);
          }
          return { items: newItems };
        });
      },

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
        set({ user: null, summary: null, invoices: [], manualLogout: true });
      },

      fetchItems: async () => {
        try {
          const res = await api.get('/masters/items?limit=1000');
          // Handle standard backend envelope format
          const itemsData = res.data.data || res.data;
          set({ 
            items: itemsData, 
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch items from API:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
          throw err;
        }
      },

      fetchInvoices: async () => {
        try {
          const res = await api.get('/transactions/sales-invoices?limit=50');
          // Handle standard backend envelope format
          const invoicesData = res.data.data || res.data;
          set({ 
            invoices: invoicesData, 
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch invoices from API:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
          throw err;
        }
      },

      fetchSummary: async () => {
        try {
          const res = await api.get('/reports/summary');
          set({ 
            summary: res.data, 
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch summary from API:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
          throw err;
        }
      }
    }),
    {
      name: 'groww-you-erp-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist dashboard summary, user, items cache, and offline settings for offline access
      partialize: (state) => ({
        user: state.user,
        items: state.items,
        invoices: state.invoices,
        summary: state.summary,
        manualLogout: state.manualLogout,
        isOffline: state.isOffline,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('An error occurred during Zustand store hydration:', error);
          } else if (state) {
            state.setHasHydrated(true);
          }
        };
      },
    }
  )
);
