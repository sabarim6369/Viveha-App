import mongoose, { Schema } from 'mongoose';

const itemGroupSchema = new Schema({
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Item group name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

export const ItemGroup = mongoose.model('ItemGroup', itemGroupSchema);
export default ItemGroup;
