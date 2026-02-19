// Validation middleware for business module
import { Request, Response, NextFunction } from 'express';

export const validateCreateItem = (req: Request, res: Response, next: NextFunction) => {
    const { clientId, name, price } = req.body;
    
    if (!clientId || !name || price === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Client ID, name, and price are required',
        });
    }
    
    next();
};

export const validateCreateCart = (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.body;
    
    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: 'Client ID is required',
        });
    }
    
    next();
};

export const validateAddToCart = (req: Request, res: Response, next: NextFunction) => {
    const { cartId, itemId, itemName, unitPrice, quantity } = req.body;
    
    if (!cartId || !itemId || !itemName || unitPrice === undefined || !quantity) {
        return res.status(400).json({
            success: false,
            message: 'Cart ID, item ID, item name, unit price, and quantity are required',
        });
    }
    
    next();
};
