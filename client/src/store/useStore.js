import { create } from "zustand";
import api from "../utils/api";

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

  // Master Data Cache
  customers: [],
  vendors: [],
  items: [],
  company: null,

  // Loading Flags
  loadingCustomers: false,
  loadingVendors: false,
  loadingItems: false,
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
    });
  },

  // Cache Actions
  fetchCustomers: async (force = false) => {
    // Skip fetching if already loaded, unless forced
    if (get().customers.length > 0 && !force) return;
    set({ loadingCustomers: true });
    try {
      const res = await api.get("/masters/customers");
      set({ customers: res.data });
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
      const res = await api.get("/masters/vendors");
      set({ vendors: res.data });
    } catch (err) {
      console.error("Failed to fetch/cache vendors:", err);
      throw err;
    } finally {
      set({ loadingVendors: false });
    }
  },

  addVendor: async (vendorData) => {
    try {
      const { name, mobile, address, gstin, openingBalance } = vendorData;
      const res = await api.post("/masters/vendors", { name, mobile, address, gstin, openingBalance });
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
      const res = await api.get("/masters/items");
      set({ items: res.data });
    } catch (err) {
      console.error("Failed to fetch/cache items:", err);
      throw err;
    } finally {
      set({ loadingItems: false });
    }
  },

  addItem: async (itemData) => {
    try {
      const { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert } = itemData;
      const res = await api.post("/masters/items", { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert });
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
}));
