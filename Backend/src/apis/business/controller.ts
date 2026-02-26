import { Request, Response } from 'express';
import * as businessService from '../../services/businessService.js';

const badRequest = (res: Response, msg: string) =>
    res.status(400).json({ success: false, message: msg });
const serverError = (res: Response, e: any) =>
    res
        .status(500)
        .json({ success: false, message: e.message || 'Internal error' });

// ================= CART =================

export const createCartController = async (req: Request, res: Response) => {
    try {
        if (!req.body.clientId) return badRequest(res, 'clientId required');
        return res
            .status(201)
            .json(
                await businessService.createCart(
                    req.body.clientId,
                    req.body.clientCustomerPhone || null,
                ),
            );
    } catch (e) {
        return serverError(res, e);
    }
};

export const addToCartController = async (req: Request, res: Response) => {
    try {
        const { cartId, itemId, unitPrice, quantity, itemName } = req.body;
        if (!cartId || !itemId || !itemName || unitPrice === undefined || !quantity)
            return badRequest(res, 'invalid cart payload');
        return res.json(
            await businessService.addToCart(
                cartId,
                itemId,
                itemName,
                unitPrice,
                quantity,
            ),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const removeFromCartController = async (req: Request, res: Response) => {
    try {
        const { cartId, cartItemId } = req.body;
        if (!cartId || !cartItemId)
            return badRequest(res, 'cartId and cartItemId required');
        return res.json(await businessService.removeFromCart(cartId, cartItemId));
    } catch (e) {
        return serverError(res, e);
    }
};

export const getCartController = async (req: Request, res: Response) => {
    try {
        const { cartId } = req.params;
        if (!cartId) return badRequest(res, 'cartId required');
        return res.json(await businessService.getCart(cartId as string));
    } catch (e) {
        return serverError(res, e);
    }
};

export const clearCartController = async (req: Request, res: Response) => {
    try {
        const { cartId } = req.body;
        if (!cartId) return badRequest(res, 'cartId required');
        return res.json(await businessService.clearCart(cartId));
    } catch (e) {
        return serverError(res, e);
    }
};

// ================= ITEM GROUP =================

export const createItemGroupController = async (req: Request, res: Response) => {
    try {
        const { clientId, name, description } = req.body;
        if (!clientId || !name)
            return badRequest(res, 'clientId and name required');
        return res
            .status(201)
            .json(await businessService.createItemGroup(clientId, name, description));
    } catch (e) {
        return serverError(res, e);
    }
};

export const getItemGroupsController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(await businessService.getItemGroups(clientId as string));
    } catch (e) {
        return serverError(res, e);
    }
};

export const updateItemGroupController = async (req: Request, res: Response) => {
    try {
        const { clientId, groupId } = req.params;
        if (!clientId || !groupId)
            return badRequest(res, 'clientId and groupId required');
        return res.json(
            await businessService.updateItemGroup(clientId as string, groupId as string, req.body),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const deleteItemGroupController = async (req: Request, res: Response) => {
    try {
        const { clientId, groupId } = req.params;
        if (!clientId || !groupId)
            return badRequest(res, 'clientId and groupId required');
        return res.json(await businessService.deleteItemGroup(clientId as string, groupId as string));
    } catch (e) {
        return serverError(res, e);
    }
};

// ================= ITEMS =================

export const createItemController = async (req: Request, res: Response) => {
    try {
        const { clientId, name, price, stock, unit, groupId, description } =
            req.body;
        if (!clientId || !name || price === undefined)
            return badRequest(res, 'clientId,name,price required');
        return res
            .status(201)
            .json(
                await businessService.createItem(
                    clientId,
                    name,
                    price,
                    stock,
                    unit,
                    groupId,
                    description,
                ),
            );
    } catch (e) {
        return serverError(res, e);
    }
};

export const getItemsController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(
            await businessService.getItems(clientId as string, req.query.groupId as string),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const updateItemController = async (req: Request, res: Response) => {
    try {
        const { clientId, itemId } = req.params;
        if (!clientId || !itemId)
            return badRequest(res, 'clientId and itemId required');
        return res.json(
            await businessService.updateItem(clientId as string, itemId as string, req.body),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const deleteItemController = async (req: Request, res: Response) => {
    try {
        const { clientId, itemId } = req.params;
        if (!clientId || !itemId)
            return badRequest(res, 'clientId and itemId required');
        return res.json(await businessService.deleteItem(clientId as string, itemId as string));
    } catch (e) {
        return serverError(res, e);
    }
};

// ================= INVOICE =================

export const generateInvoiceController = async (req: Request, res: Response) => {
    try {
        if (!req.body.clientId || !req.body.cartId)
            return badRequest(res, 'clientId and cartId required');
        return res
            .status(201)
            .json(await businessService.generateInvoice(req.body.clientId, req.body));
    } catch (e: any) {
        return badRequest(res, e.message);
    }
};

export const generateInvoiceWithProductsController = async (req: Request, res: Response) => {
    try {
        if (!req.body.clientId || !req.body.products)
            return badRequest(res, 'clientId and products required');
        return res
            .status(201)
            .json(
                await businessService.generateInvoiceWithProduct(
                    req.body.clientId,
                    req.body,
                ),
            );
    } catch (e: any) {
        return badRequest(res, e.message);
    }
};

export const getInvoicesController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(await businessService.getInvoices(clientId as string));
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const recordPaymentController = async (req: Request, res: Response) => {
    try {
        const { clientId, invoiceId, amount } = req.body;
        if (!clientId || !invoiceId || amount === undefined)
            return badRequest(res, 'clientId,invoiceId,amount required');
        return res.json(
            await businessService.recordPayment(
                clientId,
                invoiceId,
                amount,
                req.body.method,
                req.body.note,
            ),
        );
    } catch (e: any) {
        return badRequest(res, e.message);
    }
};

export const getPaymentsController = async (req: Request, res: Response) => {
    try {
        const { invoiceId } = req.params;
        const { clientId } = req.query;
        if (!invoiceId || !clientId)
            return badRequest(res, 'invoiceId and clientId required');
        return res.json(
            await businessService.getPaymentsForInvoice(clientId as string, invoiceId as string),
        );
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const getPurchaseHistoryController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(
            await businessService.getPurchaseHistory(
                clientId as string,
                (req.query.clientCustomerId as string) || null,
                (req.query.clientCustomerPhone as string) || null,
            ),
        );
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const getPendingInvoicesController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(await businessService.getPendingInvoices(clientId as string));
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const getPaymentReportController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(await businessService.getPaymentReport(clientId as string));
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const getPendingInvoicesByClientCustomerController = async (
    req: Request,
    res: Response,
) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(
            await businessService.getPendingInvoicesByClientCustomer(
                clientId as string,
                clientCustomerId as string,
                (req.query.clientCustomerPhone as string) || null,
            ),
        );
    } catch (e: any) {
        return serverError(res, e);
    }
};

export const getPaidInvoicesByClientCustomerController = async (req: Request, res: Response) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(
            await businessService.getPaidInvoicesByClientCustomer(
                clientId as string,
                clientCustomerId as string,
                (req.query.clientCustomerPhone as string) || null,
            ),
        );
    } catch (e: any) {
        return serverError(res, e);
    }
};

// ================= CLIENT CUSTOMER =================

export const createClientCustomerController = async (req: Request, res: Response) => {
    try {
        const { clientId, name, phone } = req.body;
        if (!clientId || !name || !phone)
            return badRequest(res, 'clientId,name,phone required');
        await businessService.createclientCustomer(
            clientId,
            name,
            phone,
            req.body.address,
            req.body.emailId,
            req.body.gstNo,
        ).then((data) => {
            return res.status(201).json(data);
        }).catch((e) => {
            return badRequest(res, e.message);
        });

    } catch (e) {
        return serverError(res, e);
    }
};

export const createclientCustomerController = async (req: Request, res: Response) =>
    createClientCustomerController(req, res);

export const getClientCustomersController = async (req: Request, res: Response) => {
    try {
        if (!req.params.clientId) return badRequest(res, 'clientId required');
        return res.json(
            await businessService.getclientCustomers(req.params.clientId as string),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const getclientCustomersController = async (req: Request, res: Response) =>
    getClientCustomersController(req, res);

export const getclientCustomerByPhoneController = async (req: Request, res: Response) => {
    try {
        const { clientId, phone } = req.params;
        if (!clientId || !phone)
            return badRequest(res, 'clientId and phone required');
        return res.json(
            await businessService.getclientCustomerByPhone(clientId as string, phone as string),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const updateclientCustomerController = async (req: Request, res: Response) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(
            await businessService.updateclientCustomer(
                clientId as string,
                clientCustomerId as string,
                req.body,
            ),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const deleteclientCustomerController = async (req: Request, res: Response) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(
            await businessService.deleteclientCustomer(clientId as string, clientCustomerId as string),
        );
    } catch (e) {
        return serverError(res, e);
    }
};

export const getClientCustomerProfileController = async (req: Request, res: Response) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(
            await businessService.getClientCustomerProfile(clientId as string, clientCustomerId as string),
        );
    } catch (e: any) {
        return serverError(res, e);
    }
};
