import express from "express";
import rateLimit from "express-rate-limit";
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

const reportsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many report requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(reportsLimiter);

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
