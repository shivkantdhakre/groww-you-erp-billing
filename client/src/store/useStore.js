import { create } from "zustand";
import api, { registerLogoutHandler } from "../utils/api";

export const useStore = create((set, get) => ({
  // Auth State
  token: localStorage.getItem("token") || null,
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })(),

  // UI Responsive States
  sidebarOpen: false,
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),

  // Master Data Cache
  customers: [],
  vendors: [],
  items: [],
  leads: [],
  company: null,
  notifications: [],
  users: [],

  // Loading Flags
  loadingCustomers: false,
  loadingVendors: false,
  loadingItems: false,
  loadingLeads: false,
  loadingCompany: false,

  // Auth Actions
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({
      token: null,
      user: null,
      customers: [],
      vendors: [],
      items: [],
      company: null,
      notifications: [],
      users: [],
    });
  },

  // Cache Actions
  fetchCustomers: async (force = false) => {
    // Skip fetching if already loaded, unless forced
    if (get().customers.length > 0 && !force) return;
    set({ loadingCustomers: true });
    try {
      const res = await api.get("/masters/customers?limit=1000&page=1");
      set({ customers: res.data.data });
    } catch (err) {
      console.error("Failed to fetch/cache customers:", err);
      throw err;
    } finally {
      set({ loadingCustomers: false });
    }
  },

  addCustomer: async (customerData) => {
    try {
      const res = await api.post("/masters/customers", customerData);
      set((state) => ({
        customers: [...state.customers, res.data],
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to create customer and cache:", err);
      throw err;
    }
  },

  fetchVendors: async (force = false) => {
    if (get().vendors.length > 0 && !force) return;
    set({ loadingVendors: true });
    try {
      const res = await api.get("/masters/vendors?limit=1000&page=1");
      set({ vendors: res.data.data });
    } catch (err) {
      console.error("Failed to fetch/cache vendors:", err);
      throw err;
    } finally {
      set({ loadingVendors: false });
    }
  },

  addVendor: async (vendorData) => {
    try {
      const { name, mobile, address, gstin, openingBalance, pincode } = vendorData;
      const res = await api.post("/masters/vendors", { name, mobile, address, gstin, openingBalance, pincode });
      const fullVendor = { ...vendorData, ...res.data };
      set((state) => ({
        vendors: [...state.vendors, fullVendor],
      }));
      return fullVendor;
    } catch (err) {
      console.error("Failed to create vendor and cache:", err);
      throw err;
    }
  },

  fetchItems: async (force = false) => {
    if (get().items.length > 0 && !force) return;
    set({ loadingItems: true });
    try {
      const res = await api.get("/masters/items?limit=1000&page=1");
      set({ items: res.data.data });
    } catch (err) {
      console.error("Failed to fetch/cache items:", err);
      throw err;
    } finally {
      set({ loadingItems: false });
    }
  },

  addItem: async (itemData) => {
    try {
      const { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert, hsnCode } = itemData;
      const res = await api.post("/masters/items", { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert, hsnCode });
      const fullItem = { ...itemData, ...res.data };
      set((state) => ({
        items: [...state.items, fullItem],
      }));
      return fullItem;
    } catch (err) {
      console.error("Failed to create item and cache:", err);
      throw err;
    }
  },

  // Company Actions
  fetchCompany: async () => {
    set({ loadingCompany: true });
    try {
      const res = await api.get("/company");
      set({ company: res.data });
      return res.data;
    } catch (err) {
      console.error("Failed to fetch company settings:", err);
      throw err;
    } finally {
      set({ loadingCompany: false });
    }
  },

  updateCompany: async (companyData) => {
    try {
      const res = await api.put("/company", companyData);
      set({ company: res.data });
      return res.data;
    } catch (err) {
      console.error("Failed to update company settings:", err);
      throw err;
    }
  },

  // Customer Actions (PUT & DELETE)
  updateCustomer: async (id, customerData) => {
    try {
      const res = await api.put(`/masters/customers/${id}`, customerData);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === parseInt(id) ? res.data : c)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to update customer:", err);
      throw err;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.delete(`/masters/customers/${id}`);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== parseInt(id)),
      }));
    } catch (err) {
      console.error("Failed to delete customer:", err);
      throw err;
    }
  },

  // Vendor Actions (PUT & DELETE)
  updateVendor: async (id, vendorData) => {
    try {
      const res = await api.put(`/masters/vendors/${id}`, vendorData);
      set((state) => ({
        vendors: state.vendors.map((v) => (v.id === parseInt(id) ? res.data : v)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to update vendor:", err);
      throw err;
    }
  },

  deleteVendor: async (id) => {
    try {
      await api.delete(`/masters/vendors/${id}`);
      set((state) => ({
        vendors: state.vendors.filter((v) => v.id !== parseInt(id)),
      }));
    } catch (err) {
      console.error("Failed to delete vendor:", err);
      throw err;
    }
  },

  // Item Actions (PUT & DELETE)
  updateItem: async (id, itemData) => {
    try {
      const res = await api.put(`/masters/items/${id}`, itemData);
      set((state) => ({
        items: state.items.map((i) => (i.id === parseInt(id) ? res.data : i)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to update item:", err);
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      await api.delete(`/masters/items/${id}`);
      set((state) => ({
        items: state.items.filter((i) => i.id !== parseInt(id)),
      }));
    } catch (err) {
      console.error("Failed to delete item:", err);
      throw err;
    }
  },

  // Notifications Actions
  fetchNotifications: async () => {
    try {
      const res = await api.get("/notifications");
      set({ notifications: res.data });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  },

  markNotificationRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  },

  clearNotifications: async () => {
    try {
      await api.delete("/notifications/clear");
      set({ notifications: [] });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  },

  // Users Management Actions
  fetchUsers: async () => {
    try {
      const res = await api.get("/users");
      set({ users: res.data });
    } catch (err) {
      console.error("Failed to fetch users:", err);
      throw err;
    }
  },

  addUser: async (userData) => {
    try {
      const res = await api.post("/users", userData);
      set((state) => ({ users: [...state.users, res.data] }));
      return res.data;
    } catch (err) {
      console.error("Failed to add user:", err);
      throw err;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const res = await api.put(`/users/${userId}`, userData);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? res.data : u)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to update user:", err);
      throw err;
    }
  },

  deleteUser: async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
      }));
    } catch (err) {
      console.error("Failed to delete user:", err);
      throw err;
    }
  },

  // Profile Settings Actions
  updateProfile: async (profileData) => {
    try {
      const res = await api.put("/users/profile", profileData);
      const currentUser = get().user;
      const updatedUser = { ...currentUser, ...res.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
      return res.data;
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const res = await api.put("/users/change-password", passwordData);
      return res.data;
    } catch (err) {
      console.error("Failed to change password:", err);
      throw err;
    }
  },

  verifyStatus: async () => {
    try {
      const res = await api.get("/auth/verify-status");
      const { token, subscription } = res.data;
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, subscription };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("token", token);
        set({ token, user: updatedUser });
      }
      return subscription;
    } catch (err) {
      console.error("Failed to verify subscription status:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        get().logout();
      }
      throw err;
    }
  },

  // CRM Lead Store Actions
  fetchLeads: async (force = false) => {
    if (get().leads.length > 0 && !force) return;
    set({ loadingLeads: true });
    try {
      const res = await api.get("/leads?limit=1000&page=1");
      set({ leads: res.data.data });
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      throw err;
    } finally {
      set({ loadingLeads: false });
    }
  },

  addLead: async (leadData) => {
    try {
      const res = await api.post("/leads", leadData);
      set((state) => ({
        leads: [res.data, ...state.leads],
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to create lead:", err);
      throw err;
    }
  },

  updateLead: async (leadId, leadData) => {
    try {
      const res = await api.put(`/leads/${leadId}`, leadData);
      set((state) => ({
        leads: state.leads.map((l) => (l.id === leadId ? res.data : l)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to update lead:", err);
      throw err;
    }
  },

  addLeadInteraction: async (leadId, interactionData) => {
    try {
      const res = await api.post(`/leads/${leadId}/interactions`, interactionData);
      // Re-fetch or update lead locally
      const leadRes = await api.get(`/leads/${leadId}`);
      set((state) => ({
        leads: state.leads.map((l) => (l.id === leadId ? leadRes.data : l)),
      }));
      return leadRes.data;
    } catch (err) {
      console.error("Failed to add interaction:", err);
      throw err;
    }
  },

  analyzeLeadWithAI: async (leadId) => {
    try {
      const res = await api.put(`/leads/${leadId}/ai-analyze`);
      set((state) => ({
        leads: state.leads.map((l) => (l.id === leadId ? res.data : l)),
      }));
      return res.data;
    } catch (err) {
      console.error("Failed to analyze lead with AI:", err);
      throw err;
    }
  },

  deleteLead: async (leadId) => {
    try {
      await api.delete(`/leads/${leadId}`);
      set((state) => ({
        leads: state.leads.filter((l) => l.id !== leadId),
      }));
    } catch (err) {
      console.error("Failed to delete lead:", err);
      throw err;
    }
  },
}));

registerLogoutHandler(() => {
  useStore.getState().logout();
});
