export const validateCreateItem = (req, res, next) => {
    const { clientId, name, price } = req.body;
    if (!clientId || !name || price === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Client ID, name, and price are required',
        });
    }
    next();
};
export const validateCreateCart = (req, res, next) => {
    const { clientId } = req.body;
    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: 'Client ID is required',
        });
    }
    next();
};
export const validateAddToCart = (req, res, next) => {
    const { cartId, itemId, itemName, unitPrice, quantity } = req.body;
    if (!cartId || !itemId || !itemName || unitPrice === undefined || !quantity) {
        return res.status(400).json({
            success: false,
            message: 'Cart ID, item ID, item name, unit price, and quantity are required',
        });
    }
    next();
};
