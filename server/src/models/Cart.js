import mongoose, { Schema } from 'mongoose';

const cartSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    clientCustomerId: {
        type: Schema.Types.ObjectId,
        ref: 'clientCustomer',
        default: null,
    },
    clientCustomerPhone: {
        type: String,
        trim: true,
        default: null,
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: [0, 'Total amount cannot be negative'],
    },
    itemCount: {
        type: Number,
        default: 0,
    },
    isFinalized: {
        type: Boolean,
        default: false,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        index: { expireAfterSeconds: 86400 }, // Auto-delete after 24 hours
    },
}, { timestamps: true });

export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
