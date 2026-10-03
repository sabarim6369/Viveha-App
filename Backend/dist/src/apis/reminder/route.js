import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { createReminder, getReminders, getPendingReminders, updateReminderStatus, markReminderAsRead, deleteReminder, markAllRemindersAsRead, } from './controller.js';
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
// Mark reminder as read
router.patch('/:reminderId/read', markReminderAsRead);
// Delete reminder
router.delete('/:reminderId', deleteReminder);
// Mark all reminders as read (clear all notifications)
router.patch('/', markAllRemindersAsRead);
export default router;
