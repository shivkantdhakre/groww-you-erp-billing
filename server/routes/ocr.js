import express from 'express';
import multer from 'multer';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';
import { processInvoiceOCR } from '../controllers/ocrController.js';

const router = express.Router();

// Memory storage engine for Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, JPG, and WEBP files are allowed.'));
    }
  }
});

// POST /api/invoices/ocr
router.post(
  '/',
  verifyTokenAndTenant,
  upload.single('file'),
  processInvoiceOCR
);

export default router;
