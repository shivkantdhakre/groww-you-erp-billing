import express from 'express';
import { login, forgotPassword, verifyStatus } from '../controllers/authController.js';
import { validate, forgotPasswordSchema } from '../middleware/validateMiddleware.js';
import { verifyTokenAndTenant } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password (validated)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// GET /api/auth/verify-status (authenticated)
router.get('/verify-status', verifyTokenAndTenant, verifyStatus);

// GET /api/auth/status
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'Ready', message: 'Auth service is running' });
});

export default router;
