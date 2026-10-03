import mongoose, { Schema } from 'mongoose';
const pageTrackingSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    pageName: {
        type: String,
        required: [true, 'Page name is required'],
        trim: true,
        index: true,
    },
    timeSpent: {
        type: Number,
        required: [true, 'Time spent is required'],
        min: [0, 'Time spent cannot be negative'],
    },
    sessionId: {
        type: String,
        trim: true,
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    deviceInfo: {
        platform: {
            type: String,
            trim: true,
        },
        appVersion: {
            type: String,
            trim: true,
        },
    },
}, {
    timestamps: true,
});
// Compound index for efficient querying
pageTrackingSchema.index({ clientId: 1, timestamp: -1 });
pageTrackingSchema.index({ clientId: 1, pageName: 1 });
const PageTracking = mongoose.model('PageTracking', pageTrackingSchema);
export default PageTracking;
