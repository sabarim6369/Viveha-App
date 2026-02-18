import { Request, Response } from 'express';
import * as businessService from '../../../services/businessService.ts';

const badRequest = (res: Response, msg: string) =>
    res.status(400).json({ success: false, message: msg });
const serverError = (res: Response, e: any) =>
    res
        .status(500)
        .json({ success: false, message: e.message || 'Internal error' });

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
