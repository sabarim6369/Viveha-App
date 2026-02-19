// Validation middleware for dashboard module
import { Request, Response, NextFunction } from 'express';

// Add validation functions as needed
export const validateDashboardQuery = (req: Request, res: Response, next: NextFunction) => {
    // Add validation logic if needed
    next();
};
