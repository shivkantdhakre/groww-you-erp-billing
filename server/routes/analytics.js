import express from "express";
import rateLimit from "express-rate-limit";
import { getSalesInsights, saveInsightsFeedback } from "../controllers/analyticsController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce token verification and multi-tenant security
router.use(verifyTokenAndTenant);

// Rate limiter for analytics & AI endpoints to prevent abusive calls
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Too many analytics requests. Please try again in a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(analyticsLimiter);

router.get("/sales-insights", getSalesInsights);
router.post("/sales-insights/feedback", saveInsightsFeedback);

export default router;
