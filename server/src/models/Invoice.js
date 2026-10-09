import mongoose, { Schema } from 'mongoose';

const invoiceSchema = new Schema({
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
    clientCustomerName: {
        type: String,
        trim: true,
        default: '',
    },
    clientCustomerPhone: {
        type: String,
        trim: true,
        default: '',
    },
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        trim: true,
        minlength: 1
    },
    invoiceDate: {
        type: String,
        default: () => new Date().toISOString().split('T')[0],
    },
    dueDate: {
        type: String,
        default: () => {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date.toISOString().split('T')[0];
        },
    },
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative'],
        default: 0,
    },
    totalTax: {
        type: Number,
        min: [0, 'Tax cannot be negative'],
        default: 0,
    },
    totalDiscount: {
        type: Number,
        min: [0, 'Discount cannot be negative'],
        default: 0,
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    paidAmount: {
        type: Number,
        required: [true, 'Paid amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Item',
                required: true,
            },
            itemName: {
                type: String,
                required: [true, 'Item name is required'],
                trim: true,
            },
            itemGroup: {
                type: String,
                trim: true,
                default: '',
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, 'Quantity must be at least 1'],
            },
            costPerUnit: {
                type: Number,
                required: true,
                min: [0, 'Cost per unit cannot be negative'],
            },
        },
    ],
    isFinalized: {
        type: Boolean,
        default: false,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
    generatedAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, { timestamps: true });

invoiceSchema.index({ clientId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
