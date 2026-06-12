import express from "express";
import {
  getSalesInvoices,
  createSalesInvoice,
  getSalesInvoiceById,
  getPurchaseInvoices,
  createPurchaseInvoice,
  getPurchaseInvoiceById,
  getSalesReturns,
  createSalesReturn,
  getPurchaseReturns,
  createPurchaseReturn
} from "../controllers/transactionsController.js";
import {
  getVouchers,
  createVoucher,
  cancelVoucher
} from "../controllers/vouchersController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply the security middleware to ALL routes in this file
router.use(verifyTokenAndTenant);

// --- SALES INVOICES ---
router.get("/sales-invoices", getSalesInvoices);
router.post("/sales-invoices", createSalesInvoice);
router.get("/sales-invoices/:id", getSalesInvoiceById);

// --- PURCHASE INVOICES ---
router.get("/purchase-invoices", getPurchaseInvoices);
router.post("/purchase-invoices", createPurchaseInvoice);
router.get("/purchase-invoices/:id", getPurchaseInvoiceById);

// --- RETURNS ---
router.get("/sales-returns", getSalesReturns);
router.post("/sales-returns", createSalesReturn);

router.get("/purchase-returns", getPurchaseReturns);
router.post("/purchase-returns", createPurchaseReturn);

// --- VOUCHERS (Contra, Journal, Payment, Receipt) ---
router.get("/vouchers", getVouchers);
router.post("/vouchers", createVoucher);
router.post("/vouchers/:id/cancel", cancelVoucher);

export default router;
