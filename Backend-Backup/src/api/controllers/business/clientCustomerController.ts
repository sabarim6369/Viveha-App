import { Request, Response } from 'express';
import * as businessService from '../../../services/businessService.ts';

const badRequest = (res: Response, msg: string) =>
    res.status(400).json({ success: false, message: msg });
const serverError = (res: Response, e: any) =>
    res
        .status(500)
        .json({ success: false, message: e.message || 'Internal error' });

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
