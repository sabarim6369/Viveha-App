import express from 'express';
import { sendOTPController } from '../controllers/otp/otpController.js';
const router = express.Router();
/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to phone number
 * @body    { phoneNumber: string, purpose: 'register' | 'login' }
 * @returns { success: boolean, message: string }
 */
router.post('/send', sendOTPController);
export default router;
