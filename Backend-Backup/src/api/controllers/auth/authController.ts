import { Request, Response } from 'express';
import {
    registerClient,
    loginClient,
    logoutClient,
} from '../../../services/authService.ts';

interface AuthenticatedRequest extends Request {
    auth?: {
        clientId: string;
        deviceSessionId: string;
    };
}

export const registerController = async (req: Request, res: Response) => {
    try {
        const {
            phoneNumber,
            otp,
            ownerName,
            businessName,
            deviceId,
            shopName,
            location,
            city,
            state,
            gstin,
            profileUrl,
        } = req.body;

        if (!phoneNumber || !otp || !ownerName || !businessName) {
            return res.status(400).json({
                success: false,
                message:
                    'Phone number, otp, owner name, and business name are required',
            });
        }

        const result = await registerClient({
            phoneNumber,
            otp,
            ownerName,
            businessName,
            deviceId,
            shopName,
            location,
            city,
            state,
            gstin,
            profileUrl,
        });
        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginController = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp, deviceId } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and otp are required',
            });
        }

        const result = await loginClient(phoneNumber, otp, deviceId);
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

export const logoutController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId;
        const deviceSessionId = req.auth?.deviceSessionId;

        if (!deviceSessionId) {
            return res.status(400).json({
                success: false,
                message: 'Device session ID is required',
            });
        }

        // clientId is strongly typed as string | undefined, assuming business logic handles undefined if needed,
        // but logoutClient expects string.
        // However, if deviceSessionId exists, usually clientId should too in this auth scheme.
        // If not, we might need a non-null assertion or check.
        // For now, passing as string based on usage.
        const result = await logoutClient(clientId as string, deviceSessionId);
        return res.status(200).json({ ...result, deviceSessionId });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
