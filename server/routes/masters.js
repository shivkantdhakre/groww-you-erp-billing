import express from "express";
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
  getVendors,
  createVendor,
  deleteVendor,
  getItems,
  createItem,
  deleteItem
} from "../controllers/mastersController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply the security middleware to ALL routes in this file
router.use(verifyTokenAndTenant);

// Customers
router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.delete("/customers/:id", deleteCustomer);

// Vendors
router.get("/vendors", getVendors);
router.post("/vendors", createVendor);
router.delete("/vendors/:id", deleteVendor);

// Items (Inventory)
router.get("/items", getItems);
router.post("/items", createItem);
router.delete("/items/:id", deleteItem);

export default router;
