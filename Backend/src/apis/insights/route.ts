import express from 'express';
import {
    trackPageTimeController,
    getPageTimeInsightsController,
    getTrackingHistoryController,
} from './controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All insights routes require authentication
router.use(authenticateToken);

/**
 * POST /api/insights/track
 * Track page time for a user
 * Body: { pageName: string, timeSpent: number, sessionId?: string, deviceInfo?: object }
 */
router.post('/track', trackPageTimeController);

/**
 * GET /api/insights/page-time
 * Get aggregated insights of time spent on each page
 * Query params: startDate, endDate, pageName, limit
 */
router.get('/page-time', getPageTimeInsightsController);

/**
 * GET /api/insights/history
 * Get detailed tracking history
 * Query params: page, limit, pageName, sessionId
 */
router.get('/history', getTrackingHistoryController);

export default router;
