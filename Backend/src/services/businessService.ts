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
    IInvoice
} from '../models/Model.ts';

// Helper to return invoice products as stored snapshots
const buildInvoiceWithProductDetails = async (invoiceDoc: any) => {
    if (!invoiceDoc) return invoiceDoc;

    const invoiceObj =
        typeof invoiceDoc.toObject === 'function'
            ? invoiceDoc.toObject()
            : { ...invoiceDoc };

    const products = (invoiceObj.products || []).map((product: any) => ({
        productId: product.productId || null,
        itemName: product.itemName || '',
        costPerUnit: product.costPerUnit,
        quantity: product.quantity,
        itemGroup: product.itemGroup || '',
    }));

    return { ...invoiceObj, products };
};

const normalizeItemsForSyncResponse = (items: any[]) =>
    items.map((item) => ({
        ...item.toObject(),
        groupId: item.groupId ? item.groupId.toString() : null,
        productId: item._id ? item._id.toString() : null,
    }));

// const parseDateValue = (value: any) => {
//   if (!value) return undefined;
//   const date = value instanceof Date ? value : new Date(value);
//   if (Number.isNaN(date.getTime())) return undefined;
//   return date;
// };

interface ResolveCustomerParams {
    clientId: string;
    providedclientCustomerId?: string | null;
    clientCustomerName?: string;
    clientCustomerPhone?: string;
    customerPhone?: string;
    fallbackPhone?: string;
    clientCustomerAddress?: string;
    clientCustomerEmailId?: string;
    clientCustomerGstNo?: string;
}

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
}: ResolveCustomerParams) => {
    let customerDoc: any = null;
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

export const getFullClientData = async (clientId: string) => {
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
export const createItemGroup = async (clientId: string, name: string, description: string = '') => {
    try {
        const itemGroup = await ItemGroup.create({
            clientId,
            name,
            description,
        });
        return { success: true, itemGroup };
    } catch (error: any) {
        throw new Error(`Failed to create item group: ${error.message}`);
    }
};

export const getItemGroups = async (clientId: string) => {
    try {
        const itemGroups = await ItemGroup.find({ clientId });
        return { success: true, itemGroups };
    } catch (error: any) {
        throw new Error(`Failed to fetch item groups: ${error.message}`);
    }
};

export const updateItemGroup = async (clientId: string, groupId: string, updateData: any) => {
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
    } catch (error: any) {
        throw new Error(`Failed to update item group: ${error.message}`);
    }
};

export const deleteItemGroup = async (clientId: string, groupId: string) => {
    try {
        const itemGroup = await ItemGroup.findOneAndDelete({
            _id: groupId,
            clientId,
        });
        if (!itemGroup) {
            throw new Error('Item group not found');
        }
        return { success: true, message: 'Item group deleted' };
    } catch (error: any) {
        throw new Error(`Failed to delete item group: ${error.message}`);
    }
};

// ============================================================================
// ITEM SERVICES
// ============================================================================
export const createItem = async (
    clientId: string,
    name: string,
    price: number,
    stock: number = 0,
    unit: string = 'nos',
    groupId: string | null = null,
    description: string = '',
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
    } catch (error: any) {
        throw new Error(`Failed to create item: ${error.message}`);
    }
};

export const getItems = async (clientId: string, groupId: string | null = null) => {
    try {
        const filter: any = { clientId, isActive: true };
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
    } catch (error: any) {
        throw new Error(`Failed to fetch items: ${error.message}`);
    }
};

export const updateItem = async (clientId: string, itemId: string, updateData: any) => {
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
    } catch (error: any) {
        throw new Error(`Failed to update item: ${error.message}`);
    }
};

export const deleteItem = async (clientId: string, itemId: string) => {
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
    } catch (error: any) {
        throw new Error(`Failed to delete item: ${error.message}`);
    }
};

// ============================================================================
// CLIENT clientCustomer SERVICES (Client clientCustomers with name and phone)
// ============================================================================
const sanitizeclientCustomerName = (rawName: string) => {
    const trimmed = (rawName || '').trim();
    if (trimmed.length >= 2) return trimmed;
    return 'clientCustomer';
};

export const createclientCustomer = async (
    clientId: string,
    name: string,
    phone: string,
    address: string = '',
    emailId: string = '',
    gstNo: string = '',
) => {
    const phoneNumber = (phone || '').trim();
    const nameToUse = sanitizeclientCustomerName(name);

    try {
        const client: any = await Client.findById(clientId).lean();
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
        const existingCustomer: any = await clientCustomer.findOne({
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
    } catch (error: any) {
        throw new Error(`Failed to create client clientCustomer: ${error.message}`);
    }
};

export const getclientCustomers = async (clientId: string) => {
    try {
        const clientCustomers = await clientCustomer.find({ clientId }).sort({
            createdAt: -1,
        });
        return { success: true, clientCustomers };
    } catch (error: any) {
        throw new Error(`Failed to fetch client clientCustomers: ${error.message}`);
    }
};

export const getclientCustomerByPhone = async (clientId: string, phone: string) => {
    try {
        const result = await clientCustomer.findOne({
            clientId,
            phoneNumber: phone,
        });
        return { success: true, clientCustomer: result };
    } catch (error: any) {
        throw new Error(`Failed to fetch client clientCustomer: ${error.message}`);
    }
};

export const updateclientCustomer = async (
    clientId: string,
    clientCustomerId: string,
    updateData: any,
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
    } catch (error: any) {
        throw new Error(`Failed to update client clientCustomer: ${error.message}`);
    }
};

export const deleteclientCustomer = async (clientId: string, clientCustomerId: string) => {
    try {
        const result = await clientCustomer.findOneAndDelete({
            _id: clientCustomerId,
            clientId,
        });
        if (!result) {
            throw new Error('Client clientCustomer not found');
        }
        return { success: true, message: 'Client clientCustomer deleted' };
    } catch (error: any) {
        throw new Error(`Failed to delete client clientCustomer: ${error.message}`);
    }
};

// ============================================================================
// CART SERVICES
// ============================================================================
export const createCart = async (clientId: string, clientCustomerPhone: string | null = null) => {
    try {
        const cart = await Cart.create({
            clientId,
            clientCustomerPhone,
            totalAmount: 0,
            itemCount: 0,
        });
        return { success: true, cart };
    } catch (error: any) {
        throw new Error(`Failed to create cart: ${error.message}`);
    }
};

export const addToCart = async (
    cartId: string,
    itemId: string,
    itemName: string,
    unitPrice: number,
    quantity: number,
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
    } catch (error: any) {
        throw new Error(`Failed to add item to cart: ${error.message}`);
    }
};

export const removeFromCart = async (cartId: string, cartItemId: string) => {
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
    } catch (error: any) {
        throw new Error(`Failed to remove item from cart: ${error.message}`);
    }
};

export const getCart = async (cartId: string) => {
    try {
        const cart = await Cart.findById(cartId);
        const cartItems = await CartItem.find({ cartId });
        if (!cart) {
            throw new Error('Cart not found');
        }
        return { success: true, cart, cartItems };
    } catch (error: any) {
        throw new Error(`Failed to fetch cart: ${error.message}`);
    }
};

export const clearCart = async (cartId: string) => {
    try {
        await CartItem.deleteMany({ cartId });
        await Cart.findByIdAndDelete(cartId);
        return { success: true, message: 'Cart cleared' };
    } catch (error: any) {
        throw new Error(`Failed to clear cart: ${error.message}`);
    }
};

// ============================================================================
// INVOICE & PAYMENT SERVICES
// ============================================================================
interface InvoiceData {
    cartId: string;
    clientCustomerId?: string | null;
    clientCustomerName?: string;
    clientCustomerPhone?: string;
    customerPhone?: string;
    clientCustomerAddress?: string;
    clientCustomerEmailId?: string;
    clientCustomerGstNo?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    totalAmount?: number;
    totalTax?: number;
    totalDiscount?: number;
    paidAmount?: number;
    notes?: string;
}

export const generateInvoice = async (clientId: string, invoiceData: InvoiceData) => {
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

        // Fetch client settings for tax calculation
        const client: any = await Client.findById(clientId).lean();
        if (!client) {
            throw new Error('Client not found');
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
                fallbackPhone: cart.clientCustomerPhone || undefined,
                clientCustomerAddress,
                clientCustomerEmailId,
                clientCustomerGstNo,
            });

        const totalFromCart = cartItems.reduce(
            (sum, item) => sum + item.lineTotal,
            0,
        );

        // Auto-calculate tax if enabled in client settings
        let finalTotalTax = totalTax;
        const taxSettings = client?.clientSettings?.taxSettings;
        if (taxSettings?.enableTaxCalculation && taxSettings?.primaryTaxRate > 0) {
            // Calculate tax as percentage of subtotal
            finalTotalTax = (totalFromCart * taxSettings.primaryTaxRate) / 100;
        }

        const totalAmount =
            typeof providedTotalAmount === 'number'
                ? providedTotalAmount
                : totalFromCart + finalTotalTax - totalDiscount;
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
            .map((id) => id!.toString()); // Convert to string for Map key

        // Convert groupIds from string back to ObjectId for find if needed, or query by array of strings?
        // mongoose .find({ _id: { $in: [...] } }) works with strings if valid ObjectIds.

        const groups = groupIds.length
            ? await ItemGroup.find({ _id: { $in: groupIds } })
            : [];
        const groupMap = new Map(
            groups.map((group) => [group._id.toString(), group.name]),
        );

        const invoiceProducts = cartItems.map((item) => {
            const itemDoc: any = itemMap.get(item.itemId?.toString());
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
            totalTax: finalTotalTax,
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
    } catch (error: any) {
        throw new Error(`Failed to generate invoice: ${error.message}`);
    }
};

interface DirectInvoiceData {
    products: Array<{
        productId: string;
        quantity: number;
    }>;
    clientCustomerId?: string | null;
    clientCustomerName?: string;
    clientCustomerPhone?: string;
    customerPhone?: string;
    clientCustomerAddress?: string;
    clientCustomerEmailId?: string;
    clientCustomerGstNo?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    subtotal?: number;
    totalAmount?: number;
    totalTax?: number;
    totalDiscount?: number;
    paidAmount?: number;
    notes?: string;
}

export const generateInvoiceWithProduct = async (clientId: string, invoiceData: DirectInvoiceData) => {
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

        // Fetch client settings for tax calculation
        const client: any = await Client.findById(clientId).lean();
        if (!client) {
            throw new Error('Client not found');
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
            .map((id) => id!.toString());
        const groups = groupIds.length
            ? await ItemGroup.find({ _id: { $in: groupIds } })
            : [];
        const groupMap = new Map(
            groups.map((group) => [group._id.toString(), group.name]),
        );

        const invoiceProducts = products.map((product) => {
            const itemDoc: any = itemMap.get(product.productId.toString());
            if (!itemDoc) {
                throw new Error('Product not found');
            }
            const groupName = itemDoc?.groupId
                ? groupMap.get(itemDoc.groupId.toString()) || ''
                : '';

            return {
                productId: new mongoose.Types.ObjectId(product.productId),
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

        // Auto-calculate tax if enabled in client settings
        let finalTotalTax = totalTax;
        const taxSettings = client?.clientSettings?.taxSettings;
        if (taxSettings?.enableTaxCalculation && taxSettings?.primaryTaxRate > 0) {
            // Calculate tax as percentage of subtotal
            finalTotalTax = (subtotal * taxSettings.primaryTaxRate) / 100;
        }

        // Check if totalAmount is provided, otherwise default to subtotal + tax - discount
        // The original logic seemed to rely on providedTotalAmount being passed if strictly needed,
        // or implies calculation.
        // Looking at original code:
        // const totalAmount = providedTotalAmount ... ? providedTotalAmount : ...
        // BUT in generateInvoice (cart), it was calculated.
        // In generateInvoiceWithProduct (original js), it was:
        // const subtotal = ...
        // ...
        // const totalAmount = providedTotalAmount ...

        // Let's stick to original logic:
        const totalAmount =
            typeof providedTotalAmount === 'number'
                ? providedTotalAmount
                : subtotal + finalTotalTax - totalDiscount;

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
            totalTax: finalTotalTax,
            totalDiscount,
            totalAmount,
            paidAmount,
            products: invoiceProducts,
            notes,
            isFinalized,
        });

        // Update stock
        for (const product of products) {
            if (product.productId) {
                const dbItem = await Item.findById(product.productId);
                if (dbItem && dbItem.stock >= product.quantity) {
                    dbItem.stock -= product.quantity;
                    await dbItem.save();
                }
            }
        }

        // Record initial payment
        if (paidAmount > 0) {
            await Payment.create({
                clientId,
                invoiceId: invoice._id,
                amount: paidAmount,
                method: 'cash',
                note: 'Payment at invoice generation',
            });
        }

        // Create purchase history
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
    } catch (error: any) {
        throw new Error(`Failed to generate invoice with products: ${error.message}`);
    }
};

// ============================================================================
// INVOICE GETTERS & PAYMENTS
// ============================================================================

export const getInvoices = async (clientId: string) => {
    try {
        const invoices = await Invoice.find({ clientId }).sort({
            createdAt: -1,
        });
        const invoicesWithProducts = await Promise.all(
            invoices.map((inv) => buildInvoiceWithProductDetails(inv))
        );
        return { success: true, invoices: invoicesWithProducts };
    } catch (error: any) {
        throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
};

export const recordPayment = async (
    clientId: string,
    invoiceId: string,
    amount: number,
    method: string = 'cash',
    note: string = '',
) => {
    try {
        const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (amount <= 0) {
            throw new Error('Payment amount must be positive');
        }

        if (invoice.paidAmount + amount > invoice.totalAmount) {
            throw new Error('Payment exceeds total amount');
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
        }
        await invoice.save();

        return { success: true, payment, invoice };
    } catch (error: any) {
        throw new Error(`Failed to record payment: ${error.message}`);
    }
};

export const getPaymentsForInvoice = async (clientId: string, invoiceId: string) => {
    try {
        const invoice = await Invoice.findOne({ _id: invoiceId, clientId });
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const payments = await Payment.find({ invoiceId }).sort({ paidAt: -1 });
        return { success: true, payments };
    } catch (error: any) {
        throw new Error(`Failed to fetch payments: ${error.message}`);
    }
};

export const getPurchaseHistory = async (
    clientId: string,
    clientCustomerId: string | null = null,
    clientCustomerPhone: string | null = null,
) => {
    try {
        const query: any = { clientId };
        if (clientCustomerId) {
            query.clientCustomerId = clientCustomerId;
        }
        if (clientCustomerPhone) {
            query.clientCustomerPhone = clientCustomerPhone;
        }

        const history = await PurchaseHistory.find(query)
            .populate('invoiceId')
            .sort({ purchasedAt: -1 });

        return { success: true, history };
    } catch (error: any) {
        throw new Error(`Failed to fetch purchase history: ${error.message}`);
    }
};

export const getPendingInvoices = async (clientId: string) => {
    try {
        const invoices = await Invoice.find({
            clientId,
            $expr: { $lt: ['$paidAmount', '$totalAmount'] },
        }).sort({ createdAt: 1 });

        return { success: true, pendingInvoices: invoices };
    } catch (error: any) {
        throw new Error(`Failed to fetch pending invoices: ${error.message}`);
    }
};

export const getPendingInvoicesByClientCustomer = async (
    clientId: string,
    clientCustomerId: string,
    clientCustomerPhone: string | null = null,
) => {
    try {
        const query: any = {
            clientId,
            clientCustomerId,
            $expr: { $lt: ['$paidAmount', '$totalAmount'] },
        };

        const invoices = await Invoice.find(query).sort({ createdAt: 1 });
        return { success: true, pendingInvoices: invoices };
    } catch (error: any) {
        throw new Error(`Failed to fetch pending invoices for clientCustomer: ${error.message}`);
    }
};

export const getPaidInvoicesByClientCustomer = async (
    clientId: string,
    clientCustomerId: string,
    clientCustomerPhone: string | null = null,
) => {
    try {
        const query: any = {
            clientId,
            clientCustomerId,
            $expr: { $gte: ['$paidAmount', '$totalAmount'] },
        };

        const invoices = await Invoice.find(query).sort({ createdAt: -1 });
        return { success: true, paidInvoices: invoices };
    } catch (error: any) {
        throw new Error(`Failed to fetch paid invoices for clientCustomer: ${error.message}`);
    }
};

export const getPaymentReport = async (clientId: string) => {
    try {
        const totalSales = await Invoice.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    paid: { $sum: '$paidAmount' },
                },
            },
        ]);

        const totalReceived = totalSales[0]?.paid || 0;
        const totalPending = (totalSales[0]?.total || 0) - totalReceived;

        return {
            success: true,
            report: {
                totalSales: totalSales[0]?.total || 0,
                totalReceived,
                totalPending,
            },
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch payment report: ${error.message}`);
    }
};

// Get customer profile with all invoices and payments
export const getClientCustomerProfile = async (clientId: string, clientCustomerId: string) => {
    try {
        // Get customer details
        const customer = await clientCustomer.findOne({
            _id: clientCustomerId,
            clientId,
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Get all invoices (pending and paid) for this customer
        const allInvoices = await Invoice.find({
            clientId,
            clientCustomerId,
        }).sort({ createdAt: -1 });

        // Build invoices with product details
        const invoicesWithProducts = await Promise.all(
            allInvoices.map((inv) => buildInvoiceWithProductDetails(inv))
        );

        // Separate pending and paid invoices
        const pendingInvoices = invoicesWithProducts.filter(
            (inv) => inv.paidAmount < inv.totalAmount
        );
        const paidInvoices = invoicesWithProducts.filter(
            (inv) => inv.paidAmount >= inv.totalAmount
        );

        // Calculate total balance (pending amount)
        const totalBalance = pendingInvoices.reduce(
            (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
            0
        );

        // Get all payments for this customer
        const payments = await Payment.find({
            clientId,
            invoiceId: { $in: allInvoices.map((inv) => inv._id) },
        }).sort({ paidAt: -1 });

        return {
            success: true,
            customer: customer.toObject(),
            pendingInvoices,
            paidInvoices,
            totalBalance,
            payments,
            statistics: {
                totalPendingInvoices: pendingInvoices.length,
                totalPaidInvoices: paidInvoices.length,
                totalInvoices: allInvoices.length,
                totalAmountPaid: paidInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
            },
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch customer profile: ${error.message}`);
    }
};

// ============================================================================
// SYNC SERVICES
// ============================================================================

export const syncClientData = async (clientId: string, data: any) => {
    try {
        // Placeholder for upstream sync logic.
        // In a full implementation, we would process `data.invoices`, `data.clientCustomers`, etc.
        // and merge them into the database.

        if (data?.invoices && Array.isArray(data.invoices)) {
            // Basic invoice sync logic could go here
            // For now, logging to avoid data loss during stub execution
            console.log(`Received ${data.invoices.length} invoices for sync from ${clientId}`);
        }

        // Return full client data for downstream sync
        const fullData = await getFullClientData(clientId);
        return { success: true, ...fullData };
    } catch (error: any) {
        throw new Error(`Sync failed: ${error.message}`);
    }
};
