import { Request, Response } from 'express';
import * as businessService from '../../../services/businessService.ts';

const badRequest = (res: Response, msg: string) =>
    res.status(400).json({ success: false, message: msg });
const serverError = (res: Response, e: any) =>
    res
        .status(500)
        .json({ success: false, message: e.message || 'Internal error' });

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
