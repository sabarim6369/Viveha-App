import express from 'express';
import { sendOTPController } from './controller.ts';

const router = express.Router();

/**
 * @route   POST /api/mockotp/send
 * @desc    Send mock OTP to phone number (testing only)
 * @body    { phoneNumber: string, purpose: 'register' | 'login' }
 * @returns { success: boolean, message: string }
 */
router.post('/send', sendOTPController);

export default router;
