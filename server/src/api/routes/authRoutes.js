import express from 'express';
import { registerController, loginController, logoutController, } from '../controllers/auth/authController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
const router = express.Router();
import { authLimiter } from '../../middleware/rateLimiter.js';

/**
 * @route   POST /api/auth/register
 * @desc    Register new client (OTP based)
 * @body    { phoneNumber: string, otp: string, ownerName: string, businessName: string, ...profileFields }
 * @returns { success: boolean, clientId: string, phoneNumber: string }
 */
router.post('/register', authLimiter, registerController);

/**
 * @route   POST /api/auth/login
 * @desc    Login client with OTP
 * @body    { phoneNumber: string, otp: string, deviceId?: string }
 * @returns { success: boolean, token: string, clientId: string, deviceSessionId: string }
 */
router.post('/login', authLimiter, loginController);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout client (token-based)
 * @header  Authorization: Bearer <token>
 * @body    { deviceSessionId?: string } // optional override
 * @returns { success: boolean, message: string }
 */
router.post('/logout', authenticateToken, logoutController);
export default router;
