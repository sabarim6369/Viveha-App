import * as businessService from '../../services/businessService.js';
const badRequest = (res, msg) => res.status(400).json({ success: false, message: msg });
const serverError = (res, e) => res
    .status(500)
    .json({ success: false, message: e.message || 'Internal error' });
// ================= CART =================
export const createCartController = async (req, res) => {
    try {
        if (!req.body.clientId)
            return badRequest(res, 'clientId required');
        return res
            .status(201)
            .json(await businessService.createCart(req.body.clientId, req.body.clientCustomerPhone || null));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const addToCartController = async (req, res) => {
    try {
        const { cartId, itemId, unitPrice, quantity, itemName } = req.body;
        if (!cartId || !itemId || !itemName || unitPrice === undefined || !quantity)
            return badRequest(res, 'invalid cart payload');
        return res.json(await businessService.addToCart(cartId, itemId, itemName, unitPrice, quantity));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const removeFromCartController = async (req, res) => {
    try {
        const { cartId, cartItemId } = req.body;
        if (!cartId || !cartItemId)
            return badRequest(res, 'cartId and cartItemId required');
        return res.json(await businessService.removeFromCart(cartId, cartItemId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getCartController = async (req, res) => {
    try {
        const { cartId } = req.params;
        if (!cartId)
            return badRequest(res, 'cartId required');
        return res.json(await businessService.getCart(cartId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const clearCartController = async (req, res) => {
    try {
        const { cartId } = req.body;
        if (!cartId)
            return badRequest(res, 'cartId required');
        return res.json(await businessService.clearCart(cartId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
// ================= ITEM GROUP =================
export const createItemGroupController = async (req, res) => {
    try {
        const { clientId, name, description } = req.body;
        if (!clientId || !name)
            return badRequest(res, 'clientId and name required');
        return res
            .status(201)
            .json(await businessService.createItemGroup(clientId, name, description));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getItemGroupsController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getItemGroups(clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const updateItemGroupController = async (req, res) => {
    try {
        const { clientId, groupId } = req.params;
        if (!clientId || !groupId)
            return badRequest(res, 'clientId and groupId required');
        return res.json(await businessService.updateItemGroup(clientId, groupId, req.body));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const deleteItemGroupController = async (req, res) => {
    try {
        const { clientId, groupId } = req.params;
        if (!clientId || !groupId)
            return badRequest(res, 'clientId and groupId required');
        return res.json(await businessService.deleteItemGroup(clientId, groupId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
// ================= ITEMS =================
export const createItemController = async (req, res) => {
    try {
        const { clientId, name, actualPrice, salePrice, price, stock, unit, groupId, description } = req.body;
        // Support both old format (just price) and new format (actualPrice + salePrice)
        const finalActualPrice = actualPrice ?? price ?? 0;
        const finalSalePrice = salePrice ?? price ?? 0;
        const finalPrice = finalSalePrice; // For backward compatibility
        if (!clientId || !name || (finalActualPrice === undefined && finalSalePrice === undefined && price === undefined))
            return badRequest(res, 'clientId, name, and price information required');
        return res
            .status(201)
            .json(await businessService.createItem(clientId, name, finalActualPrice, finalSalePrice, finalPrice, stock, unit, groupId, description));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getItemsController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getItems(clientId, req.query.groupId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const updateItemController = async (req, res) => {
    try {
        const { clientId, itemId } = req.params;
        if (!clientId || !itemId)
            return badRequest(res, 'clientId and itemId required');
        return res.json(await businessService.updateItem(clientId, itemId, req.body));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const deleteItemController = async (req, res) => {
    try {
        const { clientId, itemId } = req.params;
        if (!clientId || !itemId)
            return badRequest(res, 'clientId and itemId required');
        return res.json(await businessService.deleteItem(clientId, itemId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
// ================= INVOICE =================
export const generateInvoiceController = async (req, res) => {
    try {
        if (!req.body.clientId || !req.body.cartId)
            return badRequest(res, 'clientId and cartId required');
        return res
            .status(201)
            .json(await businessService.generateInvoice(req.body.clientId, req.body));
    }
    catch (e) {
        return badRequest(res, e.message);
    }
};
export const generateInvoiceWithProductsController = async (req, res) => {
    try {
        if (!req.body.clientId || !req.body.products)
            return badRequest(res, 'clientId and products required');
        return res
            .status(201)
            .json(await businessService.generateInvoiceWithProduct(req.body.clientId, req.body));
    }
    catch (e) {
        return badRequest(res, e.message);
    }
};
export const getInvoicesController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getInvoices(clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const recordPaymentController = async (req, res) => {
    try {
        const { clientId, invoiceId, amount } = req.body;
        if (!clientId || !invoiceId || amount === undefined)
            return badRequest(res, 'clientId,invoiceId,amount required');
        // Handle custom payment date if provided
        let paidAt;
        if (req.body.paidAt) {
            paidAt = new Date(req.body.paidAt);
            if (isNaN(paidAt.getTime())) {
                return badRequest(res, 'Invalid paidAt date format');
            }
        }
        return res.json(await businessService.recordPayment(clientId, invoiceId, amount, req.body.method, req.body.note, paidAt));
    }
    catch (e) {
        return badRequest(res, e.message);
    }
};
export const getPaymentsController = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { clientId } = req.query;
        if (!invoiceId || !clientId)
            return badRequest(res, 'invoiceId and clientId required');
        return res.json(await businessService.getPaymentsForInvoice(clientId, invoiceId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getPurchaseHistoryController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getPurchaseHistory(clientId, req.query.clientCustomerId || null, req.query.clientCustomerPhone || null));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getPendingInvoicesController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getPendingInvoices(clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getPaymentReportController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getPaymentReport(clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getPendingInvoicesByClientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.getPendingInvoicesByClientCustomer(clientId, clientCustomerId, req.query.clientCustomerPhone || null));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getPaidInvoicesByClientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.getPaidInvoicesByClientCustomer(clientId, clientCustomerId, req.query.clientCustomerPhone || null));
    }
    catch (e) {
        return serverError(res, e);
    }
};
// ================= CLIENT CUSTOMER =================
export const createClientCustomerController = async (req, res) => {
    try {
        const { clientId, name, phone } = req.body;
        if (!clientId || !name || !phone)
            return badRequest(res, 'clientId,name,phone required');
        await businessService.createclientCustomer(clientId, name, phone, req.body.address, req.body.emailId, req.body.gstNo).then((data) => {
            return res.status(201).json(data);
        }).catch((e) => {
            return badRequest(res, e.message);
        });
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const createclientCustomerController = async (req, res) => createClientCustomerController(req, res);
export const getClientCustomersController = async (req, res) => {
    try {
        if (!req.params.clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getclientCustomers(req.params.clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getclientCustomersController = async (req, res) => getClientCustomersController(req, res);
export const getclientCustomerByPhoneController = async (req, res) => {
    try {
        const { clientId, phone } = req.params;
        if (!clientId || !phone)
            return badRequest(res, 'clientId and phone required');
        return res.json(await businessService.getclientCustomerByPhone(clientId, phone));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const updateclientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.updateclientCustomer(clientId, clientCustomerId, req.body));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const deleteclientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.deleteclientCustomer(clientId, clientCustomerId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getClientCustomerProfileController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.getClientCustomerProfile(clientId, clientCustomerId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
