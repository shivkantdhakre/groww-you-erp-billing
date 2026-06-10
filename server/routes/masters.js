import express from "express";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getItems,
  createItem,
  updateItem,
  deleteItem
} from "../controllers/mastersController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";
import { validate, customerSchema, vendorSchema, itemSchema } from "../middleware/validateMiddleware.js";

const router = express.Router();

// Apply the security middleware to ALL routes in this file
router.use(verifyTokenAndTenant);

// Customers
router.get("/customers", getCustomers);
router.post("/customers", validate(customerSchema), createCustomer);
router.put("/customers/:id", validate(customerSchema), updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// Vendors
router.get("/vendors", getVendors);
router.post("/vendors", validate(vendorSchema), createVendor);
router.put("/vendors/:id", validate(vendorSchema), updateVendor);
router.delete("/vendors/:id", deleteVendor);

// Items (Inventory)
router.get("/items", getItems);
router.post("/items", validate(itemSchema), createItem);
router.put("/items/:id", validate(itemSchema), updateItem);
router.delete("/items/:id", deleteItem);

export default router;
