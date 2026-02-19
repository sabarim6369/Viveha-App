// Validation middleware for auth module
import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, otp, ownerName, businessName } = req.body;
    
    if (!phoneNumber || !otp || !ownerName || !businessName) {
        return res.status(400).json({
            success: false,
            message: 'Phone number, OTP, owner name, and business name are required',
        });
    }
    
    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and OTP are required',
        });
    }
    
    next();
};
