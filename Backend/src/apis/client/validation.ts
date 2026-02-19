// Validation middleware for client module
import { Request, Response, NextFunction } from 'express';

export const validateUpdateClient = (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    
    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: 'Client ID is required',
        });
    }
    
    if (!Object.keys(req.body || {}).length) {
        return res.status(400).json({
            success: false,
            message: 'No updates provided',
        });
    }
    
    next();
};
