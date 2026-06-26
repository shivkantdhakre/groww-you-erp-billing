import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';
import * as SecureStore from '../utils/secureStoreWrapper';
import api from '../utils/api';
import * as Sentry from '@sentry/react-native';

export const zustandStorage: StateStorage = {
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  getItem: (name) => AsyncStorage.getItem(name),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

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
  hasSeenOnboarding: boolean;
  branches: Branch[];
  selectedBranchId: number | null;
  cart: CartItem[];
  itemsPage: number;
  itemsTotalPages: number;
  loadingMoreItems: boolean;
  invoicesPage: number;
  invoicesTotalPages: number;
  loadingMoreInvoices: boolean;
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
  setHasSeenOnboarding: (val: boolean) => void;
  setBranches: (branches: Branch[]) => void;
  setSelectedBranchId: (branchId: number | null) => void;
  fetchBranches: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchMoreItems: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchMoreInvoices: () => Promise<void>;
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
      hasSeenOnboarding: false,
      branches: [],
      selectedBranchId: null,
      cart: [],
      itemsPage: 1,
      itemsTotalPages: 1,
      loadingMoreItems: false,
      invoicesPage: 1,
      invoicesTotalPages: 1,
      loadingMoreInvoices: false,

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
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
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
        if (get().user && Sentry.getClient()) {
          Sentry.setUser({
            id: get().user.id.toString(),
            email: get().user.email,
            segment: `branch_${branchId || 0}`
          });
        }
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
          // Inject Sentry User Context
          if (Sentry.getClient()) {
            Sentry.setUser({
              id: user.id.toString(),
              email: user.email,
              segment: `branch_${defaultBranchId || 0}`
            });
          }
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
        // Clear Sentry User Context
        if (Sentry.getClient()) {
          Sentry.setUser(null);
        }
      },

      fetchItems: async () => {
        if (get().loadingMoreItems) return;
        set({ loading: true });
        try {
          const res = await api.get('/masters/items?limit=50&page=1');
          const itemsData = res.data.data || res.data;
          set({ 
            items: itemsData, 
            itemsPage: 1,
            itemsTotalPages: res.data.pagination?.totalPages || 1,
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch items from API:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      fetchMoreItems: async () => {
        const { itemsPage, itemsTotalPages, loadingMoreItems, isOffline, loading } = get();
        if (isOffline || loadingMoreItems || loading || itemsPage >= itemsTotalPages) return;
        
        set({ loadingMoreItems: true });
        try {
          const nextPage = itemsPage + 1;
          const res = await api.get(`/masters/items?limit=50&page=${nextPage}`);
          const resData = res.data.data || res.data;
          
          set((state) => {
            const combined = [...state.items, ...resData];
            // Deduplicate by ID to prevent FlatList crash
            const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
            
            return {
              items: uniqueItems,
              itemsPage: nextPage,
              itemsTotalPages: res.data.pagination?.totalPages || 1,
              isOffline: false
            };
          });
        } catch (err: any) {
          console.error("Failed to fetch more items:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
        } finally {
          set({ loadingMoreItems: false });
        }
      },

      fetchInvoices: async () => {
        if (get().loadingMoreInvoices) return;
        set({ loading: true });
        try {
          const res = await api.get('/transactions/sales-invoices?limit=50&page=1');
          const invoicesData = res.data.data || res.data;
          set({ 
            invoices: invoicesData, 
            invoicesPage: 1,
            invoicesTotalPages: res.data.pagination?.totalPages || 1,
            isOffline: false, 
            lastSyncedAt: new Date().toISOString() 
          });
        } catch (err: any) {
          console.error("Failed to fetch invoices from API:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      fetchMoreInvoices: async () => {
        const { invoicesPage, invoicesTotalPages, loadingMoreInvoices, isOffline, loading } = get();
        if (isOffline || loadingMoreInvoices || loading || invoicesPage >= invoicesTotalPages) return;
        
        set({ loadingMoreInvoices: true });
        try {
          const nextPage = invoicesPage + 1;
          const res = await api.get(`/transactions/sales-invoices?limit=50&page=${nextPage}`);
          const resData = res.data.data || res.data;
          
          set((state) => {
            const combined = [...state.invoices, ...resData];
            const uniqueInvoices = Array.from(new Map(combined.map(inv => [inv.id, inv])).values());
            
            return {
              invoices: uniqueInvoices,
              invoicesPage: nextPage,
              invoicesTotalPages: res.data.pagination?.totalPages || 1,
              isOffline: false
            };
          });
        } catch (err: any) {
          console.error("Failed to fetch more invoices:", err);
          if (!err.response || err.code === 'ERR_NETWORK') {
            set({ isOffline: true });
          }
        } finally {
          set({ loadingMoreInvoices: false });
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
      storage: createJSONStorage(() => zustandStorage),
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
        hasSeenOnboarding: state.hasSeenOnboarding,
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
