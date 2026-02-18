import mongoose from 'mongoose';
import { Request, Response } from 'express';

export const flushDatabaseController = async (req: Request, res: Response) => {
    try {
        await mongoose.connection.dropDatabase();

        return res.status(200).json({
            success: true,
            message: 'Database dropped successfully',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: `Failed to drop database: ${error.message}`,
        });
    }
};
