import express from 'express';
import {
    getDashboardSummaryController,
    getSalesTrendsController,
    getTopItemsController,
    getDashboardController,
} from './controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Summary cards
router.get('/summary', getDashboardSummaryController);

// Sales trends
router.get('/sales-trends', getSalesTrendsController);

// Top selling items
router.get('/top-items', getTopItemsController);

// Full dashboard payload
router.get('/', getDashboardController);

export default router;
