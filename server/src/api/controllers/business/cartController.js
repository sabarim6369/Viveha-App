import * as businessService from '../../../services/businessService.js';
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
