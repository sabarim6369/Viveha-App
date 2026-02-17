import express from 'express';
import {
  getClientController,
  updateClientController,
} from '../controllers/client/clientController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/client/:clientId
 * @desc    Get client details
 * @returns { success: boolean, client: object }
 */
router.get('/:clientId', authenticateToken, getClientController);

/**
 * @route   PUT /api/client/:clientId
 * @desc    Update client profile fields
 */
router.put('/:clientId', authenticateToken, updateClientController);

export default router;
