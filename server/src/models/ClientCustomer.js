import mongoose, { Schema } from 'mongoose';

const clientCustomerSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^\d{10,}$/, 'Please provide a valid phone number'],
    },
    name: {
        type: String,
        trim: true,
        default: '',
        validate: {
            validator: (v) => !v || v.length >= 2,
            message: 'Name must be at least 2 characters when provided',
        },
    },
    address: {
        type: String,
        trim: true,
        default: '',
    },
    emailId: {
        type: String,
        trim: true,
        default: '',
    },
    gstNo: {
        type: String,
        trim: true,
        default: '',
    },
    firstSeenAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    lastPurchaseAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

clientCustomerSchema.index({ clientId: 1, phoneNumber: 1 }, { unique: true });

export const clientCustomer = mongoose.model('clientCustomer', clientCustomerSchema);
export default clientCustomer;
