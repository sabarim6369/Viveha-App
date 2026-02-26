import { Request, Response } from 'express';
import * as businessService from '../../services/businessService.js';

const badRequest = (res: Response, msg: string) =>
    res.status(400).json({ success: false, message: msg });
const unauthorized = (res: Response) =>
    res.status(401).json({ success: false, message: 'Unauthorized' });
const serverError = (res: Response, e: any) =>
    res
        .status(500)
        .json({ success: false, message: e.message || 'Internal error' });

interface AuthenticatedRequest extends Request {
    auth?: {
        clientId: string;
    };
}

export const readyToSyncController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId || req.body?.clientId || null;
        if (!clientId) return unauthorized(res);
        return res.json({ success: true, message: 'OK', clientId });
    } catch (e) {
        return serverError(res, e);
    }
};

export const syncController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId || req.body?.clientId || null;
        if (!clientId) return badRequest(res, 'clientId required');
        return res.json(await businessService.syncClientData(clientId as string, req.body));
    } catch (e) {
        return serverError(res, e);
    }
};
