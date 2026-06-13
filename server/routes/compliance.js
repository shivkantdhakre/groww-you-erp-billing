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
import { checkSubscription } from '../middleware/checkSubscription.js';

const router = express.Router();

// Enforce authentication and subscription check on all compliance routes
router.use(verifyTokenAndTenant);
router.use(checkSubscription);

router.get('/gst/health', getDataHealthStatus);
router.post('/gst/otp/request', requestOtp);
router.post('/gst/otp/verify', verifyOtp);
router.get('/gst/gstr1/preview', previewGstr1);
router.post('/gst/gstr1/file', fileGstr1);
router.get('/gst/gstr3b/summary', getGstr3bSummary);
router.post('/ewaybill/generate/:invoiceId', generateEwayBill);
router.get('/gst/session-status', getSessionStatus);
router.get('/orphans', getOrphanedReturns);
router.post('/orphans/resolve', resolveOrphanReturn);

export default router;
