import * as businessService from '../../../services/businessService.js';
const badRequest = (res, msg) => res.status(400).json({ success: false, message: msg });
const serverError = (res, e) => res
    .status(500)
    .json({ success: false, message: e.message || 'Internal error' });
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
        return res.json(await businessService.recordPayment(clientId, invoiceId, amount, req.body.method, req.body.note));
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
