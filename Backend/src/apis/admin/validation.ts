// Validation middleware for admin module
import { Request, Response, NextFunction } from 'express';

// Add validation functions as needed
export const validateFlushDatabase = (req: Request, res: Response, next: NextFunction) => {
    // Add validation logic
    next();
};
