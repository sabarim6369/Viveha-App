import mongoose, { Schema } from 'mongoose';

const deviceSessionSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastSeenAt: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, { timestamps: true });

deviceSessionSchema.index({ clientId: 1, deviceId: 1 }, { unique: true });

export const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);
export default DeviceSession;
