import mongoose, { Schema } from 'mongoose';

const cartItemSchema = new Schema({
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'Cart',
        required: [true, 'Cart ID is required'],
        index: true,
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: [true, 'Item ID is required'],
    },
    itemNameSnapshot: {
        type: String,
        required: [true, 'Item name snapshot is required'],
    },
    unitPriceSnapshot: {
        type: Number,
        required: [true, 'Unit price snapshot is required'],
        min: [0, 'Price cannot be negative'],
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
    },
    lineTotal: {
        type: Number,
        required: [true, 'Line total is required'],
        min: [0, 'Line total cannot be negative'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, { timestamps: false });

export const CartItem = mongoose.model('CartItem', cartItemSchema);
export default CartItem;
