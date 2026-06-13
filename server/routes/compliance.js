import express from 'express';
import {
  getDataHealthStatus,
  requestOtp,
  verifyOtp,
  previewGstr1,
  fileGstr1,
  getGstr3bSummary,
  generateEwayBill,
  getSessionStatus,
  getOrphanedReturns,
  resolveOrphanReturn,
} from '../controllers/complianceController.js';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';
import { checkSubscription, requireFeature } from '../middleware/checkSubscription.js';

const router = express.Router();

// Enforce authentication and active subscription status check globally
router.use(verifyTokenAndTenant);
router.use(checkSubscription);

// --- GSTR FILING ROUTES (Restricted to Professional/Enterprise tiers) ---
router.get('/gst/health', requireFeature('gstFiling'), getDataHealthStatus);
router.post('/gst/otp/request', requireFeature('gstFiling'), requestOtp);
router.post('/gst/otp/verify', requireFeature('gstFiling'), verifyOtp);
router.get('/gst/gstr1/preview', requireFeature('gstFiling'), previewGstr1);
router.post('/gst/gstr1/file', requireFeature('gstFiling'), fileGstr1);
router.get('/gst/gstr3b/summary', requireFeature('gstFiling'), getGstr3bSummary);
router.get('/gst/session-status', requireFeature('gstFiling'), getSessionStatus);

// --- E-WAY BILL ROUTES (Restricted to Professional/Enterprise tiers) ---
router.post('/ewaybill/generate/:invoiceId', requireFeature('ewayBill'), generateEwayBill);

// --- MOCK ORPHAN RESOLUTIONS ---
router.get('/orphans', getOrphanedReturns);
router.post('/orphans/resolve', resolveOrphanReturn);

export default router;
