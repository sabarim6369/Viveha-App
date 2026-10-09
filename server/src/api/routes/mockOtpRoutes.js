import express from 'express';
import { sendOTPController } from '../controllers/mockOtp/mockOtpController.js';
const router = express.Router();
/**
 * @route   POST /api/mockotp/send
 * @desc    Send mock OTP to phone number (testing only)
 * @body    { phoneNumber: string, purpose: 'register' | 'login' }
 * @returns { success: boolean, message: string }
 */
import { otpLimiter } from '../../middleware/rateLimiter.js';

router.post('/send', otpLimiter, sendOTPController);
export default router;
