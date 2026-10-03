import express from 'express';
import { readyToSyncController, syncController, } from '../controllers/sync/syncController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
const router = express.Router();
/**
 * @route   POST /api/readytosync
 * @desc    Check if client session is valid for sync
 */
router.post('/readytosync', authenticateToken, readyToSyncController);
/**
 * @route   POST /api/sync
 * @desc    Sync offline data and return full client dataset
 */
router.post('/sync', authenticateToken, syncController);
export default router;
