import express from 'express';
import { generateInvoicePDF } from '../controllers/pdfController.js';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/invoices/:id', verifyTokenAndTenant, generateInvoicePDF);

export default router;
