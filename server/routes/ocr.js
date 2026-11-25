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
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    if (allowedMimeTypes.includes(String(file.mimetype || '').toLowerCase())) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only PDF, PNG, JPG, and WEBP files are allowed.');
      err.status = 400;
      cb(err);
    }
  }
});

// POST /api/invoices/ocr
router.post(
  '/',
  verifyTokenAndTenant,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 400);
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'File size exceeds 5MB limit. Please upload a smaller receipt or invoice.'
          : (err.message || 'Invalid document upload.');
        return res.status(status).json({ error: message });
      }
      next();
    });
  },
  processInvoiceOCR
);

export default router;
