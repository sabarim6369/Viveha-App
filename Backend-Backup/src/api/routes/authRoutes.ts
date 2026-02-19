import express from 'express';
import {
    registerController,
    loginController,
    logoutController,
} from '../controllers/auth/authController.ts';
import { authenticateToken } from '../../middleware/authMiddleware.ts';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new client (OTP based)
 * @body    { phoneNumber: string, otp: string, ownerName: string, businessName: string, ...profileFields }
 * @returns { success: boolean, clientId: string, phoneNumber: string }
 */
router.post('/register', registerController);

/**
 * @route   POST /api/auth/login
 * @desc    Login client with OTP
 * @body    { phoneNumber: string, otp: string, deviceId?: string }
 * @returns { success: boolean, token: string, clientId: string, deviceSessionId: string }
 */
router.post('/login', loginController);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout client (token-based)
 * @header  Authorization: Bearer <token>
 * @body    { deviceSessionId?: string } // optional override
 * @returns { success: boolean, message: string }
 */
router.post('/logout', authenticateToken, logoutController);

export default router;
