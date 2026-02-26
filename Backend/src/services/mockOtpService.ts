import { Client, OtpSession } from '../models/Model.js'; // Imports will be fixed generally later if needed, matching current pattern
import crypto from 'crypto';

const OTP_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;

function generateOtp(): number {
    return 1234; // Mock OTP for testing
}

function hashOtp(otp: number | string): string {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

interface OtpResult {
    status: boolean;
    message: string;
}

const sendOtpNotification = async (phoneNumber: string, otp: number): Promise<OtpResult> => {
    return { status: true, message: 'OTP sent successfully.' };
};

const assertPurpose = (purpose: string): 'register' | 'login' => {
    const allowed = ['register', 'login'];
    if (allowed.includes(purpose)) return purpose as 'register' | 'login';
    throw new Error('Purpose must be either register or login');
};

export const sendOTP = async (phoneNumber: string, purpose: string) => {
    try {
        const normalizedPurpose = assertPurpose(purpose);

        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        if (normalizedPurpose === 'register') {
            const existingClient = await Client.findOne({ phoneNumber });
            if (existingClient) {
                throw new Error('Phone number already registered');
            }
        }

        if (normalizedPurpose === 'login') {
            const client = await Client.findOne({ phoneNumber });
            if (!client) {
                throw new Error('Client not found. Please register first');
            }
            if (client.isActive === false) {
                throw new Error('Account is not active');
            }
        }

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

        await OtpSession.deleteMany({ phoneNumber, purpose: normalizedPurpose });

        await OtpSession.create({
            phoneNumber,
            purpose: normalizedPurpose,
            otpHash: hashOtp(otp),
            expiresAt,
            isVerified: false,
            attempts: 0,
        });

        const result = await sendOtpNotification(phoneNumber, otp);

        if (!result.status) {
            throw new Error(result.message);
        }
        return {
            success: true,
            message: 'OTP sent successfully',
            phoneNumber,
            expiresInSeconds: OTP_TTL_SECONDS,
        };
    } catch (error: any) {
        throw new Error(`Failed to send OTP: ${error.message}`);
    }
};

export const verifyOTP = async (phoneNumber: string, otp: string | number, purpose: string, consume: boolean = true) => {
    try {
        const normalizedPurpose = assertPurpose(purpose);

        const otpSession = await OtpSession.findOne({
            phoneNumber,
            purpose: normalizedPurpose,
        });

        if (!otpSession) {
            throw new Error('OTP not found. Please request a new OTP');
        }

        if (otpSession.expiresAt < new Date()) {
            await OtpSession.deleteOne({ _id: otpSession._id });
            throw new Error('OTP session expired. Please request new OTP');
        }

        if (otpSession.attempts >= MAX_ATTEMPTS) {
            await OtpSession.deleteOne({ _id: otpSession._id });
            throw new Error('Maximum OTP attempts exceeded. Please request new OTP');
        }

        if (otpSession.otpHash !== hashOtp(otp)) {
            otpSession.attempts += 1;
            await otpSession.save();
            throw new Error('Invalid OTP');
        }

        if (consume) {
            await OtpSession.deleteOne({ _id: otpSession._id });
        } else {
            otpSession.isVerified = true;
            await otpSession.save();
        }

        return {
            success: true,
            message: 'OTP verified successfully',
            phoneNumber,
        };
    } catch (error: any) {
        throw new Error(`OTP verification failed: ${error.message}`);
    }
};
