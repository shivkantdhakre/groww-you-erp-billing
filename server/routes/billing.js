import express from 'express';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';
import {
  getPlans,
  createCheckoutSession,
  handleWebhook,
  getBillingHistory,
  verifyPayment,
} from '../controllers/billingController.js';

const router = express.Router();

// Public webhook route (does not use JWT auth)
router.post('/webhooks', handleWebhook);

// Public plans list route
router.get('/plans', getPlans);

// Protected routes (requires user context)
router.use(verifyTokenAndTenant);
router.post('/checkout', createCheckoutSession);
router.post('/verify-payment', verifyPayment);
router.get('/history', getBillingHistory);

export default router;
