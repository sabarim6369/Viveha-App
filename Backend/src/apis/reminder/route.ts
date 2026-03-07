import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
    createReminder,
    getReminders,
    getPendingReminders,
    updateReminderStatus,
    deleteReminder,
    deleteAllReminders,
} from './controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create new reminder
router.post('/', createReminder);

// Get all reminders for client
router.get('/', getReminders);

// Get pending reminders as notifications
router.get('/notifications', getPendingReminders);

// Update reminder status
router.patch('/:reminderId/status', updateReminderStatus);

// Delete reminder
router.delete('/:reminderId', deleteReminder);

// Delete all reminders (clear all notifications)
router.delete('/', deleteAllReminders);

export default router;
