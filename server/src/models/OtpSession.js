import mongoose, { Schema } from 'mongoose';

const otpSessionSchema = new Schema({
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        index: true,
        trim: true,
    },
    purpose: {
        type: String,
        enum: ['generic', 'register', 'login'],
        default: 'generic',
        index: true,
    },
    otpHash: {
        type: String,
        required: [true, 'OTP hash is required'],
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration time is required'],
        index: { expireAfterSeconds: 0 }, // TTL based on expiresAt value
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    attempts: {
        type: Number,
        default: 0,
        max: [5, 'Maximum OTP attempts exceeded'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, { timestamps: false });

otpSessionSchema.index({ phoneNumber: 1, purpose: 1 });

export const OtpSession = mongoose.model('OtpSession', otpSessionSchema);
export default OtpSession;
