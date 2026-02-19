import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// CLIENT (Business Owner)
// ============================================================================
export interface IClient extends Document {
    phoneNumber: string;
    ownerName: string;
    businessName: string;
    shopName?: string;
    location?: string;
    city?: string;
    state?: string;
    gstin?: string;
    profileUrl?: string;
    clientSettings?: {
        customerFields?: {
            address?: boolean;
            gstNo?: boolean;
            emailId?: boolean;
        };
    };
    isActive?: boolean;
    createdAt?: Date;
    lastLoginAt?: Date;
}

const clientSchema = new Schema<IClient>(
    {
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
    },
    { timestamps: true },
);

// ============================================================================
// OTP SESSION (Registration Only)
// ============================================================================
export interface IOtpSession extends Document {
    phoneNumber: string;
    purpose: 'generic' | 'register' | 'login';
    otpHash: string;
    expiresAt: Date;
    isVerified: boolean;
    attempts: number;
    createdAt: Date;
}

const otpSessionSchema = new Schema<IOtpSession>(
    {
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            index: true,
            trim: true,
        },
        purpose: {
            type: String,
            enum: ['generic', 'register', 'login'],
            default: 'generic',
            index: true,
        },
        otpHash: {
            type: String,
            required: [true, 'OTP hash is required'],
        },
        expiresAt: {
            type: Date,
            required: [true, 'Expiration time is required'],
            index: { expireAfterSeconds: 0 }, // TTL based on expiresAt value
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        attempts: {
            type: Number,
            default: 0,
            max: [5, 'Maximum OTP attempts exceeded'],
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
    },
    { timestamps: false },
);

otpSessionSchema.index({ phoneNumber: 1, purpose: 1 });

// ============================================================================
// DEVICE SESSION (One Active per Client)
// ============================================================================
export interface IDeviceSession extends Document {
    clientId: mongoose.Types.ObjectId;
    deviceId: string;
    isActive: boolean;
    lastSeenAt: Date;
    createdAt: Date;
}

const deviceSessionSchema = new Schema<IDeviceSession>(
    {
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: [true, 'Client ID is required'],
            index: true,
        },
        deviceId: {
            type: String,
            required: [true, 'Device ID is required'],
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
    },
    { timestamps: true },
);

deviceSessionSchema.index({ clientId: 1, deviceId: 1 }, { unique: true });

// ============================================================================
// CLIENT clientCustomer (Single clientCustomer model)
// ============================================================================
export interface IClientCustomer extends Document {
    clientId: mongoose.Types.ObjectId;
    phoneNumber: string;
    name?: string;
    address?: string;
    emailId?: string;
    gstNo?: string;
    firstSeenAt: Date;
    lastPurchaseAt?: Date;
}

const clientCustomerSchema = new Schema<IClientCustomer>(
    {
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
                validator: (v: string) => !v || v.length >= 2,
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
    },
    { timestamps: true },
);

clientCustomerSchema.index({ clientId: 1, phoneNumber: 1 }, { unique: true });

// ============================================================================
// ITEM GROUP
// ============================================================================
export interface IItemGroup extends Document {
    clientId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const itemGroupSchema = new Schema<IItemGroup>(
    {
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
    },
    { timestamps: true },
);

// ============================================================================
// ITEM
// ============================================================================
export interface IItem extends Document {
    clientId: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    name: string;
    price: number;
    stock: number;
    unit: 'nos' | 'kg' | 'litre' | 'meter' | 'pcs';
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
    {
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: [true, 'Client ID is required'],
            index: true,
        },
        groupId: {
            type: Schema.Types.ObjectId,
            ref: 'ItemGroup',
            default: null,
        },
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            minlength: [2, 'Item name must be at least 2 characters'],
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        stock: {
            type: Number,
            required: [true, 'Stock is required'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        unit: {
            type: String,
            default: 'nos',
            enum: ['nos', 'kg', 'litre', 'meter', 'pcs'],
        },
        description: {
            type: String,
            trim: true,
            default: '',
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
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

// ============================================================================
// CART (Temporary, No Invoice Yet)
// ============================================================================
export interface ICart extends Document {
    clientId: mongoose.Types.ObjectId;
    clientCustomerId?: mongoose.Types.ObjectId;
    clientCustomerPhone?: string;
    totalAmount: number;
    itemCount: number;
    isFinalized: boolean;
    createdAt: Date;
    expiresAt: Date;
}

const cartSchema = new Schema<ICart>(
    {
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
    },
    { timestamps: true },
);

// ============================================================================
// CART ITEM
// ============================================================================
export interface ICartItem extends Document {
    cartId: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    itemNameSnapshot: string;
    unitPriceSnapshot: number;
    quantity: number;
    lineTotal: number;
    createdAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
    {
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
    },
    { timestamps: false },
);

// ============================================================================
// INVOICE (Only if Paid Amount == Total Amount) - IMMUTABLE AFTER GENERATION
// ============================================================================
export interface IInvoiceProduct {
    productId: mongoose.Types.ObjectId;
    itemName: string;
    itemGroup?: string;
    quantity: number;
    costPerUnit: number;
}

export interface IInvoice extends Document {
    clientId: mongoose.Types.ObjectId;
    clientCustomerId?: mongoose.Types.ObjectId;
    clientCustomerName?: string;
    clientCustomerPhone?: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    totalAmount: number;
    paidAmount: number;
    products: IInvoiceProduct[];
    isFinalized: boolean;
    notes?: string;
    generatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
    {
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
    },
    { timestamps: true },
);

invoiceSchema.index({ clientId: 1, invoiceNumber: 1 }, { unique: true });

// ============================================================================
// PURCHASE HISTORY
// ============================================================================
export interface IPurchaseHistory extends Document {
    clientId: mongoose.Types.ObjectId;
    clientCustomerId: mongoose.Types.ObjectId;
    clientCustomerPhone?: string;
    invoiceId: mongoose.Types.ObjectId;
    totalAmount: number;
    purchasedAt: Date;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
    {
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
    },
    { timestamps: false },
);

// ============================================================================
// PAYMENT (Multiple payments per invoice)
// ============================================================================
export interface IPayment extends Document {
    clientId: mongoose.Types.ObjectId;
    invoiceId: mongoose.Types.ObjectId;
    amount: number;
    method: 'cash' | 'card' | 'upi' | 'bank' | 'other';
    note?: string;
    paidAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
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
    },
    { timestamps: true },
);

// ============================================================================
// EXPORT MODELS
// ============================================================================
export const Client = mongoose.model<IClient>('Client', clientSchema);
export const OtpSession = mongoose.model<IOtpSession>('OtpSession', otpSessionSchema);
export const DeviceSession = mongoose.model<IDeviceSession>(
    'DeviceSession',
    deviceSessionSchema,
);
export const clientCustomer = mongoose.model<IClientCustomer>(
    'clientCustomer',
    clientCustomerSchema,
);
export const ItemGroup = mongoose.model<IItemGroup>('ItemGroup', itemGroupSchema);
export const Item = mongoose.model<IItem>('Item', itemSchema);
export const Cart = mongoose.model<ICart>('Cart', cartSchema);
export const CartItem = mongoose.model<ICartItem>('CartItem', cartItemSchema);
export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
export const PurchaseHistory = mongoose.model<IPurchaseHistory>(
    'PurchaseHistory',
    purchaseHistorySchema,
);
export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
