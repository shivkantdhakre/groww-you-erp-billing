import prisma from "../utils/prisma.js";
import { paginate } from "../utils/pagination.js";

// ==========================================
// CUSTOMER CONTROLLERS
// ==========================================

// Fetch all active customers for the logged-in user's company
export const getCustomers = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      isActive: true
    };
    const result = await paginate(prisma.customer, whereClause, req.query, null, { name: "asc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

// Create a new customer safely tied to the company
export const createCustomer = async (req, res) => {
  try {
    const { name, mobile, address, gstin, openingBalance, creditLimit } = req.body;
    
    const newCustomer = await prisma.customer.create({
      data: {
        companyId: req.user.companyId, // SECURE: Injected by middleware, not the frontend
        name,
        mobile,
        address,
        gstin,
        openingBalance: parseFloat(openingBalance) || 0.0,
        outstandingBalance: 0.0,
        creditLimit: parseFloat(creditLimit) || 0.0,
        isActive: true
      }
    });
    
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ message: "Failed to create customer" });
  }
};

// Soft delete customer safely (tenant-isolated)
export const deleteCustomer = async (req, res) => {
  try {
    await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });

    res.status(200).json({ message: "Customer soft-deleted successfully" });
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ message: "Customer not found" });
    }
    console.error("Error soft-deleting customer:", error);
    res.status(500).json({ message: "Failed to delete customer" });
  }
};

// ==========================================
// VENDOR CONTROLLERS
// ==========================================

// Fetch active vendors
export const getVendors = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      isActive: true
    };
    const result = await paginate(prisma.vendor, whereClause, req.query, null, { name: "asc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
};

// Create a vendor safely
export const createVendor = async (req, res) => {
  try {
    const { name, mobile, address, gstin, openingBalance } = req.body;
    const newVendor = await prisma.vendor.create({
      data: {
        companyId: req.user.companyId,
        name,
        mobile,
        address,
        gstin,
        openingBalance: parseFloat(openingBalance) || 0.0,
        outstandingBalance: 0.0,
        isActive: true
      }
    });
    res.status(201).json(newVendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({ message: "Failed to create vendor" });
  }
};

// Soft delete vendor safely (tenant-isolated)
export const deleteVendor = async (req, res) => {
  try {
    await prisma.vendor.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });

    res.status(200).json({ message: "Vendor soft-deleted successfully" });
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ message: "Vendor not found" });
    }
    console.error("Error soft-deleting vendor:", error);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
};

// ==========================================
// ITEM (INVENTORY) CONTROLLERS
// ==========================================

// Fetch active items
export const getItems = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      isActive: true
    };
    const result = await paginate(prisma.item, whereClause, req.query, null, { name: "asc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Failed to fetch items" });
  }
};

// Create an item safely
export const createItem = async (req, res) => {
  try {
    const { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert } = req.body;
    const newItem = await prisma.item.create({
      data: {
        companyId: req.user.companyId,
        name,
        sku,
        category,
        unit,
        purchasePrice: parseFloat(purchasePrice) || 0.0,
        salePrice: parseFloat(salePrice) || 0.0,
        gstPercentage: parseFloat(gstPercentage) || 0.0,
        openingStock: parseInt(openingStock) || 0,
        minStockAlert: parseInt(minStockAlert) || 0,
        isActive: true
      }
    });
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Failed to create item" });
  }
};

// Soft delete item safely (tenant-isolated)
export const deleteItem = async (req, res) => {
  try {
    await prisma.item.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });

    res.status(200).json({ message: "Item soft-deleted successfully" });
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ message: "Item not found" });
    }
    console.error("Error soft-deleting item:", error);
    res.status(500).json({ message: "Failed to delete item" });
  }
};

// Update Customer (tenant-isolated)
export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, gstin, openingBalance, creditLimit } = req.body;
  try {
    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        mobile,
        address,
        gstin,
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : undefined,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
      }
    });
    res.status(200).json(updated);
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ error: "Customer not found" });
    }
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

// Update Vendor (tenant-isolated)
export const updateVendor = async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, gstin, openingBalance } = req.body;
  try {
    const updated = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        name,
        mobile,
        address,
        gstin,
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : undefined,
      }
    });
    res.status(200).json(updated);
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ error: "Vendor not found" });
    }
    console.error("Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};

// Update Item (tenant-isolated)
export const updateItem = async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, unit, purchasePrice, salePrice, gstPercentage, openingStock, minStockAlert, hsnCode } = req.body;
  try {
    const updated = await prisma.item.update({
      where: { id: parseInt(id) },
      data: {
        name,
        sku,
        category,
        unit,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : undefined,
        salePrice: salePrice !== undefined ? parseFloat(salePrice) : undefined,
        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : undefined,
        openingStock: openingStock !== undefined ? parseInt(openingStock) : undefined,
        minStockAlert: minStockAlert !== undefined ? parseInt(minStockAlert) : undefined,
        hsnCode,
      }
    });
    res.status(200).json(updated);
  } catch (error) {
    if (error.status === 404 || error.code === 'P2025') {
      return res.status(404).json({ error: "Item not found" });
    }
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
};
