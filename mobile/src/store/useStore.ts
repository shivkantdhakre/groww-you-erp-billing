import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from '../utils/secureStoreWrapper';
import api from '../utils/api';

export interface Branch {
  id: number;
  companyId: number;
  name: string;
  address?: string | null;
  mobileNumber?: string | null;
  pincode?: string | null;
  isActive: boolean;
}

export interface CartItem {
  item: any;
  qty: number;
}

interface StoreState {
  token: string | null;
  user: any | null;
  items: any[];
  invoices: any[];
  customers: any[];
  offlineOutbox: any[];
  summary: any | null;
  loading: boolean;
  manualLogout: boolean;
  isOffline: boolean;
  lastSyncedAt: string | null;
  hasHydrated: boolean;
  branches: Branch[];
  selectedBranchId: number | null;
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: number) => void;
  updateCartQty: (itemId: number, qty: number) => void;
  clearCart: () => void;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: any | null) => void;
  setItems: (items: any[]) => void;
  setInvoices: (invoices: any[]) => void;
  setCustomers: (customers: any[]) => void;
  setSummary: (summary: any | null) => void;
  setManualLogout: (val: boolean) => void;
  setOffline: (val: boolean) => void;
  setLastSyncedAt: (val: string | null) => void;
  setHasHydrated: (val: boolean) => void;
  setBranches: (branches: Branch[]) => void;
  setSelectedBranchId: (branchId: number | null) => void;
  fetchBranches: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  upsertCachedItem: (item: any) => void;
  queueOfflineInvoice: (payload: any) => void;
  syncOfflineOutbox: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      items: [],
      invoices: [],
      customers: [],
      offlineOutbox: [],
      summary: null,
      loading: false,
      manualLogout: false,
      isOffline: false,
      lastSyncedAt: null,
      hasHydrated: false,
      branches: [],
      selectedBranchId: null,
      cart: [],

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
      setCustomers: (customers) => set({ customers }),
      setSummary: (summary) => set({ summary }),
      setManualLogout: (manualLogout) => set({ manualLogout }),
      setOffline: (isOffline) => set({ isOffline }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setBranches: (branches) => set({ branches }),
      addToCart: (item) => {
        set((state) => {
          const existingIndex = state.cart.findIndex((c) => c.item.id === item.id);
          if (existingIndex > -1) {
            const newCart = [...state.cart];
            newCart[existingIndex].qty += 1;
            return { cart: newCart };
          } else {
            return { cart: [...state.cart, { item, qty: 1 }] };
          }
        });
      },
      removeFromCart: (itemId) => {
        set((state) => ({
          cart: state.cart.filter((c) => c.item.id !== itemId)
        }));
      },
      updateCartQty: (itemId, qty) => {
        set((state) => ({
          cart: state.cart.map((c) => 
            c.item.id === itemId ? { ...c, qty } : c
          ).filter((c) => c.qty > 0)
        }));
      },
      clearCart: () => set({ cart: [] }),
      setSelectedBranchId: (branchId) => {
        set({ selectedBranchId: branchId, items: [], summary: null, invoices: [] });
        // Immediately trigger fresh fetches for the new branch context
        const { fetchItems, fetchSummary, fetchInvoices } = get();
        fetchItems().catch(console.error);
        fetchSummary().catch(console.error);
        fetchInvoices().catch(console.error);
      },
      fetchBranches: async () => {
        try {
          const res = await api.get('/branches');
          set({ branches: res.data });
        } catch (err: any) {
          console.error("Failed to fetch branches from API:", err);
          throw err;
        }
      },
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

      queueOfflineInvoice: (payload) => {
        set((state) => {
          // Optimistically decrement local stocks if payload is a sales-invoice
          let updatedItems = state.items;
          if (payload.items && Array.isArray(payload.items)) {
            updatedItems = state.items.map((item: any) => {
              const cartItem = payload.items.find((ci: any) => ci.itemId === item.id);
              if (cartItem && item.branchStocks) {
                return {
                  ...item,
                  branchStocks: item.branchStocks.map((bs: any) => {
                    if (bs.branchId === state.selectedBranchId) {
                      return { ...bs, stock: Math.max(0, bs.stock - cartItem.qty) };
                    }
                    return bs;
                  })
                };
              }
              return item;
            });
          }

          return {
            items: updatedItems,
            offlineOutbox: [...state.offlineOutbox, {
              id: `temp_${Date.now()}`,
              type: 'sales-invoice',
              payload,
              createdAt: new Date().toISOString()
            }]
          };
        });
      },

      syncOfflineOutbox: async () => {
        const { offlineOutbox, isOffline } = get();
        if (isOffline || offlineOutbox.length === 0) return;

        console.log(`[Sync] Triggering background outbox flush. Queue size: ${offlineOutbox.length}`);
        
        const queue = [...offlineOutbox];
        const remainingQueue: any[] = [];

        for (const item of queue) {
          try {
            if (item.type === 'sales-invoice') {
              await api.post('/transactions/sales-invoices', item.payload);
            }
            console.log(`[Sync] Outbox item ${item.id} successfully synced.`);
          } catch (err: any) {
            console.error(`[Sync] Failed to sync outbox item ${item.id}:`, err);
            // Keep in queue only if it is a connectivity failure
            if (!err.response || err.code === 'ERR_NETWORK') {
              remainingQueue.push(...queue.slice(queue.indexOf(item)));
              break;
            }
            // Discard toxic payloads (validation error/bad payload) so we do not block subsequent syncs
          }
        }

        set({ offlineOutbox: remainingQueue });
        
        // Refresh master registers
        try {
          await get().fetchInvoices();
          await get().fetchSummary();
        } catch (e) {
          console.warn('[Sync] Post-sync data refresh failed:', e);
        }
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
          const defaultBranchId = user?.branchId || null;
          set({ 
            user, 
            manualLogout: false,
            selectedBranchId: defaultBranchId
          });
        } catch (err: any) {
          throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || "Login failed");
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        await get().setToken(null);
        set({ 
          user: null, 
          summary: null, 
          invoices: [], 
          branches: [],
          selectedBranchId: null,
          manualLogout: true 
        });
      },

      fetchItems: async () => {
        try {
          const res = await api.get('/masters/items?limit=1000');
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

      fetchCustomers: async () => {
        try {
          const res = await api.get('/masters/customers?limit=1000');
          const customersData = res.data.data || res.data;
          set({ 
            customers: customersData, 
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch customers from API:", err);
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
      partialize: (state) => ({
        user: state.user,
        items: state.items,
        invoices: state.invoices,
        customers: state.customers,
        offlineOutbox: state.offlineOutbox,
        summary: state.summary,
        manualLogout: state.manualLogout,
        isOffline: state.isOffline,
        lastSyncedAt: state.lastSyncedAt,
        branches: state.branches,
        selectedBranchId: state.selectedBranchId,
        cart: state.cart,
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
