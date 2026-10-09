import mongoose, { Schema } from 'mongoose';

const paymentSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    invoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Invoice ID is required'],
        index: true,
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    method: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank', 'other'],
        default: 'cash',
    },
    note: {
        type: String,
        trim: true,
        default: '',
    },
    paidAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
