import express from 'express';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';
import { createOrder, verifyPayment } from '../controllers/razorpayController.js';

const router = express.Router();

// Protected routes (requires user context and RLS session keys)
router.use(verifyTokenAndTenant);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

export default router;
