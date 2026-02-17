import mongoose from 'mongoose';

const { Schema } = mongoose;

// ============================================================================
// CLIENT (Business Owner)
// ============================================================================
const clientSchema = new Schema(
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
const otpSessionSchema = new Schema(
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
const deviceSessionSchema = new Schema(
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
const clientCustomerSchema = new Schema(
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
  },
  { timestamps: true },
);

clientCustomerSchema.index({ clientId: 1, phoneNumber: 1 }, { unique: true });

// ============================================================================
// ITEM GROUP
// ============================================================================
const itemGroupSchema = new Schema(
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
const itemSchema = new Schema(
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
const cartSchema = new Schema(
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
const cartItemSchema = new Schema(
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
const invoiceSchema = new Schema(
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
const purchaseHistorySchema = new Schema(
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
// EXPORT MODELS
// ============================================================================
export const Client = mongoose.model('Client', clientSchema);
export const OtpSession = mongoose.model('OtpSession', otpSessionSchema);
export const DeviceSession = mongoose.model(
  'DeviceSession',
  deviceSessionSchema,
);
export const clientCustomer = mongoose.model(
  'clientCustomer',
  clientCustomerSchema,
);
export const ItemGroup = mongoose.model('ItemGroup', itemGroupSchema);
export const Item = mongoose.model('Item', itemSchema);
export const Cart = mongoose.model('Cart', cartSchema);
export const CartItem = mongoose.model('CartItem', cartItemSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const PurchaseHistory = mongoose.model(
  'PurchaseHistory',
  purchaseHistorySchema,
);

// ============================================================================
// PAYMENT (Multiple payments per invoice)
// ============================================================================
const paymentSchema = new Schema(
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

export const Payment = mongoose.model('Payment', paymentSchema);
