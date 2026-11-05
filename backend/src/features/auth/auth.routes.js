import { Router } from 'express';
import { getMe } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/auth/me - Retrieve current authenticated user profile
router.get('/me', authenticate, getMe);

export default router;

