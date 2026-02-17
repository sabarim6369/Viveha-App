import mongoose from 'mongoose';
import {
  Client,
  Item,
  ItemGroup,
  clientCustomer,
  Cart,
  CartItem,
  Invoice,
  PurchaseHistory,
  Payment,
} from '../models/Model.js';

// Helper to return invoice products as stored snapshots
const buildInvoiceWithProductDetails = async (invoiceDoc) => {
  if (!invoiceDoc) return invoiceDoc;

  const invoiceObj =
    typeof invoiceDoc.toObject === 'function'
      ? invoiceDoc.toObject()
      : { ...invoiceDoc };

  const products = (invoiceObj.products || []).map((product) => ({
    productId: product.productId || null,
    itemName: product.itemName || '',
    costPerUnit: product.costPerUnit,
    quantity: product.quantity,
    itemGroup: product.itemGroup || '',
  }));

  return { ...invoiceObj, products };
};

const normalizeItemsForSyncResponse = (items) =>
  items.map((item) => ({
    ...item.toObject(),
    groupId: item.groupId ? item.groupId.toString() : null,
    productId: item._id ? item._id.toString() : null,
  }));

const parseDateValue = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const resolveClientCustomerForInvoice = async ({
  clientId,
  providedclientCustomerId,
  clientCustomerName,
  clientCustomerPhone,
  customerPhone,
  fallbackPhone,
  clientCustomerAddress,
  clientCustomerEmailId,
  clientCustomerGstNo,
}) => {
  let customerDoc = null;
  const resolvedclientCustomerId = providedclientCustomerId || null;

  if (resolvedclientCustomerId) {
    customerDoc = await clientCustomer.findOne({
      _id: resolvedclientCustomerId,
      clientId,
    });
  }

  const phoneToUse =
    clientCustomerPhone ||
    customerPhone ||
    fallbackPhone ||
    customerDoc?.phoneNumber ||
    '';
  const nameToUse = clientCustomerName || customerDoc?.name || '';
  const addressToUse = clientCustomerAddress || customerDoc?.address || '';
  const emailIdToUse = clientCustomerEmailId || customerDoc?.emailId || '';
  const gstNoToUse = clientCustomerGstNo || customerDoc?.gstNo || '';

  if (!customerDoc && phoneToUse) {
    const createResult = await createclientCustomer(
      clientId,
      nameToUse || 'clientCustomer',
      phoneToUse,
      addressToUse,
      emailIdToUse,
      gstNoToUse,
    );
    customerDoc = createResult.clientCustomer;
  }

  const clientCustomerId = customerDoc?._id || resolvedclientCustomerId || null;

  return {
    customerDoc,
    clientCustomerId,
    nameToUse,
    phoneToUse,
  };
};

const getFullClientData = async (clientId) => {
  const [
    itemGroups,
    items,
    clientCustomers,
    rawInvoices,
    payments,
    purchaseHistory,
  ] = await Promise.all([
    ItemGroup.find({ clientId }),
    Item.find({ clientId }),
    clientCustomer.find({ clientId }).sort({ createdAt: -1 }),
    Invoice.find({ clientId }).populate('clientCustomerId'),
    Payment.find({ clientId }),
    PurchaseHistory.find({ clientId })
      .populate('clientCustomerId')
      .populate('invoiceId'),
  ]);

  const invoices = await Promise.all(
    rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
  );

  return {
    itemGroups,
    items: normalizeItemsForSyncResponse(items),
    clientCustomers,
    invoices,
    payments,
    purchaseHistory,
  };
};

// ============================================================================
// ITEM GROUP SERVICES
// ============================================================================
export const createItemGroup = async (clientId, name, description = '') => {
  try {
    const itemGroup = await ItemGroup.create({
      clientId,
      name,
      description,
    });
    return { success: true, itemGroup };
  } catch (error) {
    throw new Error(`Failed to create item group: ${error.message}`);
  }
};

export const getItemGroups = async (clientId) => {
  try {
    const itemGroups = await ItemGroup.find({ clientId });
    return { success: true, itemGroups };
  } catch (error) {
    throw new Error(`Failed to fetch item groups: ${error.message}`);
  }
};

export const updateItemGroup = async (clientId, groupId, updateData) => {
  try {
    const itemGroup = await ItemGroup.findOneAndUpdate(
      { _id: groupId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true },
    );
    if (!itemGroup) {
      throw new Error('Item group not found');
    }
    return { success: true, itemGroup };
  } catch (error) {
    throw new Error(`Failed to update item group: ${error.message}`);
  }
};

export const deleteItemGroup = async (clientId, groupId) => {
  try {
    const itemGroup = await ItemGroup.findOneAndDelete({
      _id: groupId,
      clientId,
    });
    if (!itemGroup) {
      throw new Error('Item group not found');
    }
    return { success: true, message: 'Item group deleted' };
  } catch (error) {
    throw new Error(`Failed to delete item group: ${error.message}`);
  }
};

// ============================================================================
// ITEM SERVICES
// ============================================================================
export const createItem = async (
  clientId,
  name,
  price,
  stock = 0,
  unit = 'nos',
  groupId = null,
  description = '',
) => {
  try {
    const item = await Item.create({
      clientId,
      name,
      price,
      stock,
      unit,
      groupId,
      description,
    });
    const itemObject = item.toObject();
    return {
      success: true,
      item: { ...itemObject, productId: item._id.toString() },
    };
  } catch (error) {
    throw new Error(`Failed to create item: ${error.message}`);
  }
};

export const getItems = async (clientId, groupId = null) => {
  try {
    const filter = { clientId, isActive: true };
    if (groupId) {
      filter.groupId = groupId;
    }
    const items = await Item.find(filter);
    const normalizedItems = items.map((item) => ({
      ...item.toObject(),
      groupId: item.groupId ? item.groupId.toString() : null,
      productId: item._id ? item._id.toString() : null,
    }));
    return { success: true, items: normalizedItems };
  } catch (error) {
    throw new Error(`Failed to fetch items: ${error.message}`);
  }
};

export const updateItem = async (clientId, itemId, updateData) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: itemId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true },
    );
    if (!item) {
      throw new Error('Item not found');
    }
    return { success: true, item };
  } catch (error) {
    throw new Error(`Failed to update item: ${error.message}`);
  }
};

export const deleteItem = async (clientId, itemId) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: itemId, clientId },
      { isActive: false },
      { new: true },
    );
    if (!item) {
      throw new Error('Item not found');
    }
    return { success: true, message: 'Item deleted' };
  } catch (error) {
    throw new Error(`Failed to delete item: ${error.message}`);
  }
};

// ============================================================================
// CLIENT clientCustomer SERVICES (Client clientCustomers with name and phone)
// ============================================================================
const sanitizeclientCustomerName = (rawName) => {
  const trimmed = (rawName || '').trim();
  if (trimmed.length >= 2) return trimmed;
  return 'clientCustomer';
};

export const createclientCustomer = async (
  clientId,
  name,
  phone,
  address = '',
  emailId = '',
  gstNo = '',
) => {
  const phoneNumber = (phone || '').trim();
  const nameToUse = sanitizeclientCustomerName(name);
  
  try {
    const client = await Client.findById(clientId).lean();
    if (!client) {
      throw new Error('Client not found');
    }

    const customerFieldSettings = {
      address: false,
      gstNo: false,
      emailId: false,
      ...(client.clientSettings?.customerFields || {}),
    };

    // Check if clientCustomer with this phone already exists for this client
    const existingCustomer = await clientCustomer.findOne({
      clientId,
      phoneNumber,
    });
    
    if (existingCustomer) {
      // Update existing customer with new information
      let updated = false;
      
      if (name && nameToUse !== existingCustomer.name) {
        existingCustomer.name = nameToUse;
        existingCustomer.updatedAt = new Date();
        updated = true;
      }
      
      if (address && address.trim()) {
        existingCustomer.address = address.trim();
        existingCustomer.updatedAt = new Date();
        updated = true;
      }
      
      if (emailId && existingCustomer.emailId !== emailId) {
        existingCustomer.emailId = emailId;
        updated = true;
      }
      
      if (gstNo && existingCustomer.gstNo !== gstNo) {
        existingCustomer.gstNo = gstNo;
        updated = true;
      }
      
      if (updated) {
        await existingCustomer.save();
      }
      
      // Validate only fields that are truly required
      if (customerFieldSettings.emailId && !existingCustomer.emailId) {
        throw new Error('Email ID is required');
      }
      if (customerFieldSettings.gstNo && !existingCustomer.gstNo) {
        throw new Error('GST number is required');
      }
      
      return { success: true, clientCustomer: existingCustomer, isNew: false };
    }

    // Validate NEW customer - removed address validation
    if (customerFieldSettings.emailId && !emailId) {
      throw new Error('Email ID is required');
    }
    if (customerFieldSettings.gstNo && !gstNo) {
      throw new Error('GST number is required');
    }

    // Create new client clientCustomer
    const newCustomer = await clientCustomer.create({
      clientId,
      name: nameToUse,
      phoneNumber,
      address,
      emailId,
      gstNo,
    });
    return { success: true, clientCustomer: newCustomer, isNew: true };
  } catch (error) {
    throw new Error(`Failed to create client clientCustomer: ${error.message}`);
  }
};

export const getclientCustomers = async (clientId) => {
  try {
    const clientCustomers = await clientCustomer.find({ clientId }).sort({
      createdAt: -1,
    });
    return { success: true, clientCustomers };
  } catch (error) {
    throw new Error(`Failed to fetch client clientCustomers: ${error.message}`);
  }
};

export const getclientCustomerByPhone = async (clientId, phone) => {
  try {
    const clientCustomer = await clientCustomer.findOne({
      clientId,
      phoneNumber: phone,
    });
    return { success: true, clientCustomer };
  } catch (error) {
    throw new Error(`Failed to fetch client clientCustomer: ${error.message}`);
  }
};

export const updateclientCustomer = async (
  clientId,
  clientCustomerId,
  updateData,
) => {
  try {
    const updatedCustomer = await clientCustomer.findOneAndUpdate(
      { _id: clientCustomerId, clientId },
      { ...updateData, updatedAt: new Date() },
      { new: true },
    );
    if (!updatedCustomer) {
      throw new Error('Client clientCustomer not found');
    }
    return { success: true, clientCustomer: updatedCustomer };
  } catch (error) {
    throw new Error(`Failed to update client clientCustomer: ${error.message}`);
  }
};

export const deleteclientCustomer = async (clientId, clientCustomerId) => {
  try {
    const clientCustomer = await clientCustomer.findOneAndDelete({
      _id: clientCustomerId,
      clientId,
    });
    if (!clientCustomer) {
      throw new Error('Client clientCustomer not found');
    }
    return { success: true, message: 'Client clientCustomer deleted' };
  } catch (error) {
    throw new Error(`Failed to delete client clientCustomer: ${error.message}`);
  }
};

// ============================================================================
// CART SERVICES
// ============================================================================
export const createCart = async (clientId, clientCustomerPhone = null) => {
  try {
    const cart = await Cart.create({
      clientId,
      clientCustomerPhone,
      totalAmount: 0,
      itemCount: 0,
    });
    return { success: true, cart };
  } catch (error) {
    throw new Error(`Failed to create cart: ${error.message}`);
  }
};

export const addToCart = async (
  cartId,
  itemId,
  itemName,
  unitPrice,
  quantity,
) => {
  try {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const lineTotal = unitPrice * quantity;

    const cartItem = await CartItem.create({
      cartId,
      itemId,
      itemNameSnapshot: itemName,
      unitPriceSnapshot: unitPrice,
      quantity,
      lineTotal,
    });

    // Update cart totals
    cart.totalAmount += lineTotal;
    cart.itemCount += 1;
    await cart.save();

    return { success: true, cartItem };
  } catch (error) {
    throw new Error(`Failed to add item to cart: ${error.message}`);
  }
};

export const removeFromCart = async (cartId, cartItemId) => {
  try {
    const cartItem = await CartItem.findOneAndDelete({
      _id: cartItemId,
      cartId,
    });
    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Update cart totals
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error('Cart not found');
    }
    cart.totalAmount -= cartItem.lineTotal;
    cart.itemCount -= 1;
    await cart.save();

    return { success: true, message: 'Item removed from cart' };
  } catch (error) {
    throw new Error(`Failed to remove item from cart: ${error.message}`);
  }
};

export const getCart = async (cartId) => {
  try {
    const cart = await Cart.findById(cartId);
    const cartItems = await CartItem.find({ cartId });
    if (!cart) {
      throw new Error('Cart not found');
    }
    return { success: true, cart, cartItems };
  } catch (error) {
    throw new Error(`Failed to fetch cart: ${error.message}`);
  }
};

export const clearCart = async (cartId) => {
  try {
    await CartItem.deleteMany({ cartId });
    await Cart.findByIdAndDelete(cartId);
    return { success: true, message: 'Cart cleared' };
  } catch (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
};

// ============================================================================
// INVOICE & PAYMENT SERVICES
// ============================================================================
export const generateInvoice = async (clientId, invoiceData) => {
  try {
    const {
      cartId,
      clientCustomerId: providedclientCustomerId,
      clientCustomerName,
      clientCustomerPhone,
      customerPhone,
      clientCustomerAddress,
      clientCustomerEmailId,
      clientCustomerGstNo,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount: providedTotalAmount,
      totalTax = 0,
      totalDiscount = 0,
      paidAmount: providedPaidAmount = 0,
      notes = '',
    } = invoiceData;

    if (!cartId) {
      throw new Error('cartId is required to generate invoice');
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const cartItems = await CartItem.find({ cartId });
    if (!cartItems.length) {
      throw new Error('Cart is empty');
    }

    const { clientCustomerId, nameToUse, phoneToUse } =
      await resolveClientCustomerForInvoice({
        clientId,
        providedclientCustomerId,
        clientCustomerName,
        clientCustomerPhone,
        customerPhone,
        fallbackPhone: cart.clientCustomerPhone || null,
        clientCustomerAddress,
        clientCustomerEmailId,
        clientCustomerGstNo,
      });

    const totalFromCart = cartItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const totalAmount =
      typeof providedTotalAmount === 'number'
        ? providedTotalAmount
        : totalFromCart;
    const paidAmount =
      typeof providedPaidAmount === 'number' ? providedPaidAmount : 0;

    if (paidAmount < 0) {
      throw new Error('Paid amount cannot be negative');
    }
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed total amount');
    }

    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    const isFinalized = paidAmount >= totalAmount;

    const itemIds = cartItems
      .map((item) => item.itemId)
      .filter(Boolean)
      .map((id) => id.toString());

    const items = itemIds.length
      ? await Item.find({ _id: { $in: itemIds } })
      : [];
    const itemMap = new Map(
      items.map((item) => [item._id.toString(), item.toObject()]),
    );

    const groupIds = items
      .map((item) => item.groupId)
      .filter(Boolean)
      .map((id) => id.toString());
    const groups = groupIds.length
      ? await ItemGroup.find({ _id: { $in: groupIds } })
      : [];
    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group.name]),
    );

    const invoiceProducts = cartItems.map((item) => {
      const itemDoc = itemMap.get(item.itemId?.toString());
      const groupName = itemDoc?.groupId
        ? groupMap.get(itemDoc.groupId.toString()) || ''
        : '';

      return {
        productId: item.itemId,
        itemName: item.itemNameSnapshot,
        quantity: item.quantity,
        costPerUnit: item.unitPriceSnapshot,
        itemGroup: groupName,
      };
    });

    const invoice = await Invoice.create({
      clientId,
      clientCustomerId,
      clientCustomerName: nameToUse,
      clientCustomerPhone: phoneToUse,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      dueDate,
      subtotal: totalFromCart,
      totalTax,
      totalDiscount,
      totalAmount,
      paidAmount,
      products: invoiceProducts,
      notes,
      isFinalized,
    });

    // Update stock for each item captured on the cart
    for (const cartItem of cartItems) {
      if (cartItem.itemId) {
        const dbItem = await Item.findById(cartItem.itemId);
        if (dbItem && dbItem.stock >= cartItem.quantity) {
          dbItem.stock -= cartItem.quantity;
          await dbItem.save();
        }
      }
    }

    // Record initial payment if any
    if (paidAmount > 0) {
      await Payment.create({
        clientId,
        invoiceId: invoice._id,
        amount: paidAmount,
        method: 'cash',
        note: 'Payment at invoice generation',
      });
    }

    // Create purchase history when finalized and clientCustomer is present
    if (isFinalized && clientCustomerId) {
      await PurchaseHistory.create({
        clientId,
        clientCustomerId,
        clientCustomerPhone: phoneToUse || '',
        invoiceId: invoice._id,
        totalAmount,
      });
    }

    // Clear cart after invoice generation
    await clearCart(cartId);

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, invoice: invoiceWithProducts };
  } catch (error) {
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};

export const generateInvoiceWithProduct = async (clientId, invoiceData) => {
  try {
    const {
      products,
      clientCustomerId: providedclientCustomerId,
      clientCustomerName,
      clientCustomerPhone,
      customerPhone,
      clientCustomerAddress,
      clientCustomerEmailId,
      clientCustomerGstNo,
      invoiceNumber,
      invoiceDate,
      dueDate,
      subtotal: providedSubtotal,
      totalAmount: providedTotalAmount,
      totalTax = 0,
      totalDiscount = 0,
      paidAmount: providedPaidAmount = 0,
      notes = '',
    } = invoiceData;

    if (!products || !products.length) {
      throw new Error('Products array is required and cannot be empty');
    }

    for (const product of products) {
      if (!product.productId) {
        throw new Error('Each product must include productId');
      }
      if (!product.quantity || product.quantity <= 0) {
        throw new Error('Each product must include quantity greater than 0');
      }
    }

    const { clientCustomerId, nameToUse, phoneToUse } =
      await resolveClientCustomerForInvoice({
        clientId,
        providedclientCustomerId,
        clientCustomerName,
        clientCustomerPhone,
        customerPhone,
        clientCustomerAddress,
        clientCustomerEmailId,
        clientCustomerGstNo,
      });

    const productIds = products
      .map((product) => product.productId)
      .filter(Boolean)
      .map((id) => id.toString());

    const items = productIds.length
      ? await Item.find({ _id: { $in: productIds } })
      : [];
    const itemMap = new Map(
      items.map((item) => [item._id.toString(), item.toObject()]),
    );

    const groupIds = items
      .map((item) => item.groupId)
      .filter(Boolean)
      .map((id) => id.toString());
    const groups = groupIds.length
      ? await ItemGroup.find({ _id: { $in: groupIds } })
      : [];
    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group.name]),
    );

    const invoiceProducts = products.map((product) => {
      const itemDoc = itemMap.get(product.productId.toString());
      if (!itemDoc) {
        throw new Error('Product not found');
      }
      const groupName = itemDoc?.groupId
        ? groupMap.get(itemDoc.groupId.toString()) || ''
        : '';

      return {
        productId: product.productId,
        itemName: itemDoc?.name || 'Unknown Item',
        quantity: product.quantity,
        costPerUnit: itemDoc?.price ?? 0,
        itemGroup: groupName,
      };
    });

    const calculatedSubtotal = invoiceProducts.reduce(
      (sum, product) => sum + product.costPerUnit * product.quantity,
      0,
    );
    const subtotal =
      typeof providedSubtotal === 'number'
        ? providedSubtotal
        : calculatedSubtotal;
    const totalAmount =
      typeof providedTotalAmount === 'number'
        ? providedTotalAmount
        : subtotal + totalTax - totalDiscount;
    const paidAmount =
      typeof providedPaidAmount === 'number' ? providedPaidAmount : 0;

    if (paidAmount < 0) {
      throw new Error('Paid amount cannot be negative');
    }
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed total amount');
    }

    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    const isFinalized = paidAmount >= totalAmount;

    const invoice = await Invoice.create({
      clientId,
      clientCustomerId,
      clientCustomerName: nameToUse,
      clientCustomerPhone: phoneToUse,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      dueDate,
      subtotal,
      totalTax,
      totalDiscount,
      totalAmount,
      paidAmount,
      products: invoiceProducts,
      notes,
      isFinalized,
    });

    // Update stock for each product
    for (const product of products) {
      if (product.productId) {
        const dbItem = await Item.findById(product.productId);
        if (dbItem && dbItem.stock >= product.quantity) {
          dbItem.stock -= product.quantity;
          await dbItem.save();
        }
      }
    }

    // Record initial payment if any
    if (paidAmount > 0) {
      await Payment.create({
        clientId,
        invoiceId: invoice._id,
        amount: paidAmount,
        method: 'cash',
        note: 'Payment at invoice generation',
      });
    }

    // Create purchase history when finalized and clientCustomer is present
    if (isFinalized && clientCustomerId) {
      await PurchaseHistory.create({
        clientId,
        clientCustomerId,
        clientCustomerPhone: phoneToUse || '',
        invoiceId: invoice._id,
        totalAmount,
      });
    }

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, invoice: invoiceWithProducts };
  } catch (error) {
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};

// Record a payment against an existing invoice (supports multiple payments)
export const recordPayment = async (
  clientId,
  invoiceId,
  amount,
  method = 'cash',
  note = '',
) => {
  try {
    if (amount <= 0) throw new Error('Payment amount must be positive');

    const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
    if (!invoice) throw new Error('Invoice not found');

    const remaining = invoice.totalAmount - invoice.paidAmount;
    if (amount > remaining) {
      throw new Error('Payment exceeds outstanding balance');
    }

    const payment = await Payment.create({
      clientId,
      invoiceId,
      amount,
      method,
      note,
    });

    invoice.paidAmount += amount;
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.isFinalized = true;

      if (invoice.clientCustomerId) {
        const existingHistory = await PurchaseHistory.findOne({
          invoiceId: invoice._id,
        });
        if (!existingHistory) {
          const customerDoc = await clientCustomer.findById(
            invoice.clientCustomerId,
          );
          await PurchaseHistory.create({
            clientId,
            clientCustomerId: invoice.clientCustomerId,
            clientCustomerPhone: customerDoc?.phoneNumber || '',
            invoiceId: invoice._id,
            totalAmount: invoice.totalAmount,
          });
        }
      }
    }

    await invoice.save();

    const invoiceWithProducts = await buildInvoiceWithProductDetails(invoice);

    return { success: true, payment, invoice: invoiceWithProducts };
  } catch (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }
};

export const getPaymentsForInvoice = async (clientId, invoiceId) => {
  try {
    const payments = await Payment.find({ invoiceId, clientId });
    return { success: true, payments };
  } catch (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }
};

export const getPendingInvoicesByClientCustomer = async (
  clientId,
  clientCustomerId,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId, isFinalized: false };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const rawInvoices = await Invoice.find(filter).populate('clientCustomerId');
    const invoicesWithProducts = await Promise.all(
      rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );
    const pendingInvoices = invoicesWithProducts.map((invoice) => {
      const pendingAmount = Math.max(
        (invoice.totalAmount || 0) - (invoice.paidAmount || 0),
        0,
      );
      return { ...invoice, pendingAmount };
    });

    return { success: true, pendingInvoices };
  } catch (error) {
    throw new Error(
      `Failed to fetch pending invoices by clientCustomer: ${error.message}`,
    );
  }
};

export const getPaidInvoicesByClientCustomer = async (
  clientId,
  clientCustomerId,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId, isFinalized: true };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const invoices = await Invoice.find(filter).populate('clientCustomerId');
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, invoices: invoicesWithProducts };
  } catch (error) {
    throw new Error(
      `Failed to fetch paid invoices by clientCustomer: ${error.message}`,
    );
  }
};

export const getInvoices = async (clientId) => {
  try {
    const invoices = await Invoice.find({ clientId }).populate(
      'clientCustomerId',
    );
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, invoices: invoicesWithProducts };
  } catch (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }
};

export const getPendingInvoices = async (clientId) => {
  try {
    const rawInvoices = await Invoice.find({ clientId, isFinalized: false });
    const invoicesWithProducts = await Promise.all(
      rawInvoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );
    const pendingInvoices = invoicesWithProducts.map((invoice) => {
      const pendingAmount = Math.max(
        (invoice.totalAmount || 0) - (invoice.paidAmount || 0),
        0,
      );
      return { ...invoice, pendingAmount };
    });

    return { success: true, pendingInvoices };
  } catch (error) {
    throw new Error(`Failed to fetch pending invoices: ${error.message}`);
  }
};

export const getPaymentReport = async (clientId) => {
  try {
    const invoices = await Invoice.find({ clientId });
    const summary = invoices.reduce(
      (acc, invoice) => {
        acc.totalInvoices += 1;
        acc.totalAmount += invoice.totalAmount;
        acc.totalPaid += invoice.paidAmount;
        return acc;
      },
      { totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 },
    );
    summary.totalPending = summary.totalAmount - summary.totalPaid;
    const invoicesWithProducts = await Promise.all(
      invoices.map((invoice) => buildInvoiceWithProductDetails(invoice)),
    );

    return { success: true, report: invoicesWithProducts, summary };
  } catch (error) {
    throw new Error(`Failed to fetch payment report: ${error.message}`);
  }
};

export const getPurchaseHistory = async (
  clientId,
  clientCustomerId = null,
  clientCustomerPhone = null,
) => {
  try {
    const filter = { clientId };
    if (clientCustomerId) {
      filter.clientCustomerId = clientCustomerId;
    }
    if (clientCustomerPhone) {
      filter.clientCustomerPhone = clientCustomerPhone;
    }
    const purchaseHistory = await PurchaseHistory.find(filter)
      .populate('clientCustomerId')
      .populate('invoiceId');
    return { success: true, purchaseHistory };
  } catch (error) {
    throw new Error(`Failed to fetch purchase history: ${error.message}`);
  }
};

// ============================================================================
// SYNC SERVICES (Offline → Online)
// ============================================================================
export const syncClientData = async (clientId, payload = {}) => {
  const session = await mongoose.startSession();
  const summary = {
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsDeleted: 0,
    invoicesCreated: 0,
    paymentsCreated: 0,
  };
  const synced = {
    itemsCreated: [],
    itemsUpdated: [],
    itemsDeleted: [],
    invoicesCreated: [],
    paymentsCreated: [],
  };

  try {
    const itemOps = payload.item || {};
    const invoiceOps = payload.invoice || {};
    const paymentOps = payload.payment || {};

    const itemCreates = Array.isArray(itemOps.create) ? itemOps.create : [];
    const itemUpdates = Array.isArray(itemOps.update) ? itemOps.update : [];
    const itemDeletes = Array.isArray(itemOps.delete) ? itemOps.delete : [];

    const invoiceCreates = Array.isArray(invoiceOps.create)
      ? invoiceOps.create
      : [];
    const paymentCreates = Array.isArray(paymentOps.create)
      ? paymentOps.create
      : [];

    const runSyncOperations = async () => {
      if (itemCreates.length) {
        const preparedItems = itemCreates.map((item, index) => {
          if (!item?.name || item.price === undefined) {
            throw new Error(
              `Item create at index ${index} is missing name/price`,
            );
          }
          const sanitized = { ...item };
          delete sanitized._id;
          return {
            ...sanitized,
            clientId,
          };
        });
        const createdItems = await Item.create(preparedItems, { session });
        summary.itemsCreated += createdItems.length;
        synced.itemsCreated.push(
          ...createdItems.map((item) => item._id.toString()),
        );
      }

      if (itemUpdates.length) {
        for (const item of itemUpdates) {
          const { _id, ...updateData } = item || {};
          if (!_id) {
            throw new Error('Item update requires _id');
          }
          const updated = await Item.findOneAndUpdate(
            { _id, clientId },
            { ...updateData, updatedAt: new Date() },
            { new: true, session },
          );
          if (!updated) {
            throw new Error(`Item not found for update: ${_id}`);
          }
          summary.itemsUpdated += 1;
          synced.itemsUpdated.push(_id.toString());
        }
      }

      if (itemDeletes.length) {
        for (const itemId of itemDeletes) {
          if (!itemId) continue;
          const deleted = await Item.findOneAndUpdate(
            { _id: itemId, clientId },
            { isActive: false, updatedAt: new Date() },
            { new: true, session },
          );
          if (!deleted) {
            throw new Error(`Item not found for delete: ${itemId}`);
          }
          summary.itemsDeleted += 1;
          synced.itemsDeleted.push(itemId.toString());
        }
      }

      if (invoiceCreates.length) {
        for (const [index, invoice] of invoiceCreates.entries()) {
          if (!invoice?.products || !Array.isArray(invoice.products)) {
            throw new Error(
              `Invoice create at index ${index} missing products`,
            );
          }

          const normalizedProducts = [];

          for (const [productIndex, product] of invoice.products.entries()) {
            if (product?.quantity === undefined) {
              throw new Error(
                `Invoice product at index ${productIndex} missing quantity`,
              );
            }
            if (product.quantity <= 0) {
              throw new Error(
                `Invoice product at index ${productIndex} must have quantity > 0`,
              );
            }

            let resolvedProductId = product.productId;

            if (!resolvedProductId) {
              if (!product?.itemName) {
                throw new Error(
                  `Invoice product at index ${productIndex} missing itemName`,
                );
              }
              if (product.costPerUnit === undefined) {
                throw new Error(
                  `Invoice product at index ${productIndex} missing costPerUnit`,
                );
              }

              const createdItem = await Item.create(
                [
                  {
                    clientId,
                    name: product.itemName,
                    price: product.costPerUnit,
                    stock: product.stock !== undefined ? product.stock : 0,
                    unit: product.unit || 'nos',
                    description: product.description || '',
                  },
                ],
                { session },
              );

              const created = createdItem[0];
              resolvedProductId = created._id;
              summary.itemsCreated += 1;
              synced.itemsCreated.push(created._id.toString());
            }

            normalizedProducts.push({
              productId: resolvedProductId,
              itemName: product.itemName || 'Unknown Item',
              itemGroup: product.itemGroup || '',
              quantity: product.quantity,
              costPerUnit:
                product.costPerUnit !== undefined ? product.costPerUnit : 0,
            });
          }

          const subtotalCalculated = normalizedProducts.reduce(
            (sum, product) => sum + product.costPerUnit * product.quantity,
            0,
          );
          const subtotal =
            invoice.subtotal !== undefined
              ? invoice.subtotal
              : subtotalCalculated;
          const totalTax = invoice.totalTax || 0;
          const totalDiscount = invoice.totalDiscount || 0;
          const totalAmount =
            invoice.totalAmount !== undefined
              ? invoice.totalAmount
              : subtotal + totalTax - totalDiscount;
          const paidAmount = invoice.paidAmount || 0;
          const isFinalized = paidAmount >= totalAmount;

          if (paidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
          }
          if (paidAmount > totalAmount) {
            throw new Error('Paid amount cannot exceed total amount');
          }

          const invoiceDoc = await Invoice.create(
            [
              {
                clientId,
                clientCustomerId: invoice.clientCustomerId || null,
                clientCustomerName: invoice.clientCustomerName || '',
                clientCustomerPhone: invoice.clientCustomerPhone || '',
                invoiceNumber:
                  invoice.invoiceNumber || `INV-${Date.now()}-${index}`,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                subtotal,
                totalTax,
                totalDiscount,
                totalAmount,
                paidAmount,
                products: normalizedProducts,
                notes: invoice.notes || '',
                isFinalized,
              },
            ],
            { session },
          );

          const createdInvoice = invoiceDoc[0];
          summary.invoicesCreated += 1;
          synced.invoicesCreated.push(createdInvoice._id.toString());

          for (const product of normalizedProducts) {
            if (product.productId) {
              await Item.findOneAndUpdate(
                {
                  _id: product.productId,
                  clientId,
                  stock: { $gte: product.quantity },
                },
                { $inc: { stock: -product.quantity } },
                { session },
              );
            }
          }

          if (isFinalized && createdInvoice.clientCustomerId) {
            await PurchaseHistory.create(
              [
                {
                  clientId,
                  clientCustomerId: createdInvoice.clientCustomerId,
                  clientCustomerPhone: createdInvoice.clientCustomerPhone || '',
                  invoiceId: createdInvoice._id,
                  totalAmount: createdInvoice.totalAmount,
                },
              ],
              { session },
            );
          }
        }
      }

      if (paymentCreates.length) {
        for (const [index, payment] of paymentCreates.entries()) {
          if (!payment?.invoiceId || payment.amount === undefined) {
            throw new Error(`Payment create at index ${index} missing data`);
          }
          if (payment.amount <= 0) {
            throw new Error(
              `Payment create at index ${index} must have amount > 0`,
            );
          }

          const invoiceDoc = await Invoice.findOne(
            { _id: payment.invoiceId, clientId },
            null,
            { session },
          );
          if (!invoiceDoc) {
            throw new Error(
              `Invoice not found for payment: ${payment.invoiceId}`,
            );
          }

          const remaining = invoiceDoc.totalAmount - invoiceDoc.paidAmount;
          if (payment.amount > remaining) {
            throw new Error('Payment exceeds outstanding balance');
          }

          const createdPayments = await Payment.create(
            [
              {
                clientId,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                method: payment.method || 'cash',
                note: payment.note || '',
                paidAt: parseDateValue(payment.paidAt || payment.time),
              },
            ],
            { session },
          );
          if (createdPayments?.length) {
            synced.paymentsCreated.push(createdPayments[0]._id.toString());
          }

          invoiceDoc.paidAmount += payment.amount;
          if (invoiceDoc.paidAmount >= invoiceDoc.totalAmount) {
            invoiceDoc.isFinalized = true;
          }
          await invoiceDoc.save({ session });

          if (invoiceDoc.isFinalized && invoiceDoc.clientCustomerId) {
            const existingHistory = await PurchaseHistory.findOne(
              { invoiceId: invoiceDoc._id },
              null,
              { session },
            );
            if (!existingHistory) {
              await PurchaseHistory.create(
                [
                  {
                    clientId,
                    clientCustomerId: invoiceDoc.clientCustomerId,
                    clientCustomerPhone: invoiceDoc.clientCustomerPhone || '',
                    invoiceId: invoiceDoc._id,
                    totalAmount: invoiceDoc.totalAmount,
                  },
                ],
                { session },
              );
            }
          }

          summary.paymentsCreated += 1;
        }
      }
    };

    try {
      await session.withTransaction(runSyncOperations);
    } catch (error) {
      if (
        error.message &&
        error.message.includes(
          'Transaction numbers are only allowed on a replica set member or mongos',
        )
      ) {
        await runSyncOperations();
      } else {
        throw error;
      }
    }

    const fullData = await getFullClientData(clientId);

    return {
      success: true,
      message: 'Sync completed successfully',
      summary,
      synced,
      data: fullData,
    };
  } catch (error) {
    throw new Error(`Failed to sync data: ${error.message}`);
  } finally {
    session.endSession();
  }
};
