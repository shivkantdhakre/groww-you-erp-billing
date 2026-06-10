import express from "express";
import {
  getSalesReport,
  getPurchaseReport,
  getStockReport,
  getOutstandingReport,
  getLedger,
  getCashBook,
  getBankBook,
  getDayBook,
  getSummary,
} from "../controllers/reportsController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply security middleware to all routes in this file
router.use(verifyTokenAndTenant);

router.get("/sales", getSalesReport);
router.get("/purchase", getPurchaseReport);
router.get("/stock", getStockReport);
router.get("/outstanding", getOutstandingReport);
router.get("/ledger", getLedger);
router.get("/cash-book", getCashBook);
router.get("/bank-book", getBankBook);
router.get("/day-book", getDayBook);
router.get("/summary", getSummary);

export default router;
