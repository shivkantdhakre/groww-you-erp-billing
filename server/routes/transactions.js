import express from "express";
import {
  getSalesInvoices,
  createSalesInvoice,
  getPurchaseInvoices,
  createPurchaseInvoice,
  getSalesReturns,
  createSalesReturn,
  getPurchaseReturns,
  createPurchaseReturn
} from "../controllers/transactionsController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply the security middleware to ALL routes in this file
router.use(verifyTokenAndTenant);

// --- SALES INVOICES ---
router.get("/sales-invoices", getSalesInvoices);
router.post("/sales-invoices", createSalesInvoice);

// --- PURCHASE INVOICES ---
router.get("/purchase-invoices", getPurchaseInvoices);
router.post("/purchase-invoices", createPurchaseInvoice);

// --- RETURNS ---
router.get("/sales-returns", getSalesReturns);
router.post("/sales-returns", createSalesReturn);

router.get("/purchase-returns", getPurchaseReturns);
router.post("/purchase-returns", createPurchaseReturn);

// Mock data structures for other endpoints
let vouchers = []; // Contra, Journal, Payment, Receipt

// --- VOUCHERS (Contra, Journal, Payment, Receipt) ---
router.get("/vouchers", (req, res) => {
  const { type } = req.query; // Filter by type if provided
  const companyVouchers = vouchers.filter(v => v.companyId === req.user.companyId);
  if (type) {
    const filtered = companyVouchers.filter(v => v.type.toLowerCase() === type.toLowerCase());
    return res.status(200).json(filtered);
  }
  res.status(200).json(companyVouchers);
});

router.post("/vouchers", (req, res) => {
  const { voucherNo, date, type, debitAccount, creditAccount, amount, narration } = req.body;
  if (!type || !debitAccount || !creditAccount || !amount) {
    return res.status(400).json({ message: "Voucher Type, Debit/Credit Accounts and Amount are required" });
  }
  const newVoucher = {
    id: vouchers.length + 1,
    companyId: req.user.companyId,
    voucherNo: voucherNo || `VCH-${String(vouchers.length + 1).padStart(3, "0")}`,
    date: date || new Date().toISOString().split("T")[0],
    type, // Contra, Journal, Payment, Receipt
    debitAccount,
    creditAccount,
    amount,
    narration
  };
  vouchers.push(newVoucher);
  res.status(201).json(newVoucher);
});

export default router;
