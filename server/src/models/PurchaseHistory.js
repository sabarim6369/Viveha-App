import mongoose, { Schema } from 'mongoose';

const purchaseHistorySchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    clientCustomerId: {
        type: Schema.Types.ObjectId,
        ref: 'clientCustomer',
        required: [true, 'Client clientCustomer ID is required'],
        index: true,
    },
    clientCustomerPhone: {
        type: String,
        trim: true,
        default: '',
    },
    invoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Invoice ID is required'],
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    purchasedAt: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true,
    },
}, { timestamps: false });

export const PurchaseHistory = mongoose.model('PurchaseHistory', purchaseHistorySchema);
export default PurchaseHistory;
