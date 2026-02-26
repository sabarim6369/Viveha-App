import express from 'express';
import { flushDatabaseController } from './controller.js';
const router = express.Router();
/**
 * @route   POST /api/admin/flush-db
 * @desc    Drop the entire database (protected via X-Admin-Token)
 * @header  X-Admin-Token: <ADMIN_API_TOKEN>
 */
router.post('/flush-db', flushDatabaseController);
export default router;
