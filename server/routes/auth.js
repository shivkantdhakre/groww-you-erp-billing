import express from 'express';
import { login, forgotPassword } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// GET /api/auth/status
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'Ready', message: 'Auth service is running' });
});

export default router;
