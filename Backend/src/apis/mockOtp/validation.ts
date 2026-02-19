// Validation middleware for mockOtp module
import { Request, Response, NextFunction } from 'express';

export const validateSendOTP = (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, purpose } = req.body;
    
    if (!phoneNumber || !purpose) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and purpose are required',
        });
    }
    
    next();
};
