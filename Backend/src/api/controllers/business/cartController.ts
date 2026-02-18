import { Request, Response } from 'express';
import * as businessService from '../../../services/businessService.ts';

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
