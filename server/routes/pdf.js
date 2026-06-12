import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateInvoicePDF } from '../controllers/pdfController.js';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

const pdfLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many PDF requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/invoices/:id', verifyTokenAndTenant, pdfLimiter, generateInvoicePDF);

export default router;
