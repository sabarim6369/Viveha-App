import { Request, Response } from 'express';
import {
    getClientDetails,
    updateClientProfile,
} from '../../../services/clientService.ts';

export const getClientController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required',
            });
        }

        const result = await getClientDetails(clientId as string);
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateClientController = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const updateData = req.body || {};
        console.log('Updating client profile with data:', updateData);

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required',
            });
        }

        if (!Object.keys(updateData).length) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided',
            });
        }

        const result = await updateClientProfile(clientId as string, updateData);
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
