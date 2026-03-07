import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// REMINDER MODEL
// ============================================================================
export interface IReminder extends Document {
    clientId: mongoose.Types.ObjectId;
    customerName: string;
    customerPhone: string;
    customerId?: mongoose.Types.ObjectId;
    amount: number;
    reminderDate: Date;
    message?: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    sentAt?: Date;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
    {
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: [true, 'Client ID is required'],
            index: true,
        },
        customerName: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true,
        },
        customerPhone: {
            type: String,
            required: [true, 'Customer phone is required'],
            trim: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'clientCustomer',
            index: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        reminderDate: {
            type: Date,
            required: [true, 'Reminder date is required'],
            index: true,
        },
        message: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'sent', 'failed', 'cancelled'],
            default: 'pending',
            index: true,
        },
        sentAt: {
            type: Date,
        },
        failureReason: {
            type: String,
            trim: true,
        },
    },
    { 
        timestamps: true,
    },
);

// Compound index for efficient queries
reminderSchema.index({ clientId: 1, reminderDate: 1, status: 1 });
reminderSchema.index({ reminderDate: 1, status: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', reminderSchema);
