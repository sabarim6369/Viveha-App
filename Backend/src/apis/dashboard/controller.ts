import { Request, Response } from 'express';
import * as dashboardService from '../../services/dashboardService.ts';

interface AuthenticatedRequest extends Request {
    auth?: {
        clientId: string;
    };
}

export const getDashboardSummaryController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const summary = await dashboardService.getDashboardSummary(clientId);
        return res.status(200).json(summary);
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getSalesTrendsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { months } = req.query;
        const trends = await dashboardService.getSalesTrends(clientId, months as unknown as number);
        return res.status(200).json(trends);
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getTopItemsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { limit } = req.query;
        const items = await dashboardService.getTopItems(clientId, limit as unknown as number);
        return res.status(200).json(items);
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getDashboardController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { months, limit } = req.query;
        const dashboard = await dashboardService.getDashboard(
            clientId,
            months as unknown as number,
            limit as unknown as number,
        );
        return res.status(200).json(dashboard);
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
