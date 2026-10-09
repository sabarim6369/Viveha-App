import mongoose, { Schema } from 'mongoose';

const clientSchema = new Schema({
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        index: true,
        trim: true,
        match: [/^\d{10,}$/, 'Please provide a valid phone number'],
    },
    ownerName: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
        minlength: [2, 'Owner name must be at least 2 characters'],
    },
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true,
        minlength: [2, 'Business name must be at least 2 characters'],
    },
    shopName: {
        type: String,
        trim: true,
        default: '',
    },
    location: {
        type: String,
        trim: true,
        default: '',
    },
    city: {
        type: String,
        trim: true,
        default: '',
    },
    state: {
        type: String,
        trim: true,
        default: '',
    },
    gstin: {
        type: String,
        trim: true,
        default: '',
    },
    profileUrl: {
        type: String,
        trim: true,
        default: '',
    },
    clientSettings: {
        customerFields: {
            address: {
                type: Boolean,
                default: false,
            },
            gstNo: {
                type: Boolean,
                default: false,
            },
            emailId: {
                type: Boolean,
                default: false,
            },
        },
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    lastLoginAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

export const Client = mongoose.model('Client', clientSchema);
export default Client;
