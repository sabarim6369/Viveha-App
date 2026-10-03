import { Reminder } from '../../models/Reminder.js';
// ============================================================================
// CREATE REMINDER
// ============================================================================
export const createReminder = async (req, res) => {
    try {
        const { clientId } = req.auth;
        const { customerName, customerPhone, customerId, amount, reminderDate, message } = req.body;
        console.log('📥 Received reminder request:', {
            clientId,
            customerName,
            customerPhone,
            amount,
            reminderDate,
            message,
        });
        // Validate required fields
        if (!customerName || !customerPhone || !amount || !reminderDate) {
            console.error('❌ Missing required fields');
            res.status(400).json({
                success: false,
                error: 'Missing required fields: customerName, customerPhone, amount, reminderDate',
            });
            return;
        }
        // Validate reminder date is in the future
        const reminderDateTime = new Date(reminderDate);
        const now = new Date();
        // Set both to start of day for comparison
        const reminderDateOnly = new Date(reminderDateTime.getFullYear(), reminderDateTime.getMonth(), reminderDateTime.getDate());
        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        console.log('📅 Date validation:', {
            reminderDate: reminderDateOnly.toISOString(),
            today: todayOnly.toISOString(),
            isValid: reminderDateOnly >= todayOnly,
        });
        if (reminderDateOnly < todayOnly) {
            console.error('❌ Reminder date is in the past');
            res.status(400).json({
                success: false,
                error: 'Reminder date must be today or in the future',
            });
            return;
        }
        // Create reminder
        console.log('💾 Creating reminder in database...');
        const reminder = await Reminder.create({
            clientId,
            customerName,
            customerPhone,
            customerId: customerId || undefined,
            amount,
            reminderDate: reminderDateTime,
            message: message || '',
            status: 'pending',
        });
        console.log('✅ Reminder created successfully:', reminder._id);
        res.status(201).json({
            success: true,
            message: 'Reminder created successfully',
            data: reminder,
        });
    }
    catch (error) {
        console.error('❌ Error creating reminder:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create reminder',
        });
    }
};
// ============================================================================
// GET ALL REMINDERS FOR CLIENT
// ============================================================================
export const getReminders = async (req, res) => {
    try {
        const { clientId } = req.auth;
        const { status, startDate, endDate } = req.query;
        // Build query
        const query = { clientId };
        if (status) {
            query.status = status;
        }
        if (startDate || endDate) {
            query.reminderDate = {};
            if (startDate) {
                query.reminderDate.$gte = new Date(startDate);
            }
            if (endDate) {
                query.reminderDate.$lte = new Date(endDate);
            }
        }
        // Fetch reminders
        const reminders = await Reminder.find(query)
            .sort({ reminderDate: 1, createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            count: reminders.length,
            data: reminders,
        });
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch reminders',
        });
    }
};
// ============================================================================
// GET PENDING REMINDERS (FOR NOTIFICATIONS)
// ============================================================================
export const getPendingReminders = async (req, res) => {
    try {
        const { clientId } = req.auth;
        // Get end of today (to include all reminders for today)
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        // Fetch only reminders that are due today or overdue (not future reminders)
        const reminders = await Reminder.find({
            clientId,
            status: { $in: ['pending', 'sent'] },
            reminderDate: { $lte: endOfToday }, // Only show reminders due today or past
        })
            .sort({ reminderDate: 1, createdAt: -1 })
            .lean();
        // Format as notifications
        const notifications = reminders.map(reminder => ({
            id: reminder._id.toString(),
            type: 'reminder',
            title: 'Payment Reminder',
            message: reminder.message || `Follow up with ${reminder.customerName} for pending payment`,
            customerName: reminder.customerName,
            customerPhone: reminder.customerPhone,
            amount: reminder.amount,
            timestamp: reminder.createdAt,
            reminderDate: reminder.reminderDate,
            read: reminder.read || false,
            status: reminder.status,
        }));
        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications,
        });
    }
    catch (error) {
        console.error('Error fetching pending reminders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch pending reminders',
        });
    }
};
// ============================================================================
// UPDATE REMINDER STATUS
// ============================================================================
export const updateReminderStatus = async (req, res) => {
    try {
        const { clientId } = req.auth;
        const { reminderId } = req.params;
        const { status } = req.body;
        if (!['pending', 'sent', 'failed', 'cancelled'].includes(status)) {
            res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: pending, sent, failed, or cancelled',
            });
            return;
        }
        const reminder = await Reminder.findOneAndUpdate({ _id: reminderId, clientId }, {
            status,
            ...(status === 'sent' ? { sentAt: new Date() } : {}),
        }, { new: true });
        if (!reminder) {
            res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Reminder status updated',
            data: reminder,
        });
    }
    catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update reminder',
        });
    }
};
// ============================================================================
// MARK REMINDER AS READ
// ============================================================================
export const markReminderAsRead = async (req, res) => {
    try {
        const { clientId } = req.auth;
        const { reminderId } = req.params;
        const reminder = await Reminder.findOneAndUpdate({ _id: reminderId, clientId }, { read: true }, { new: true });
        if (!reminder) {
            res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Reminder marked as read',
            data: reminder,
        });
    }
    catch (error) {
        console.error('Error marking reminder as read:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to mark reminder as read',
        });
    }
};
// ============================================================================
// DELETE REMINDER
// ============================================================================
export const deleteReminder = async (req, res) => {
    try {
        const { clientId } = req.auth;
        const { reminderId } = req.params;
        const reminder = await Reminder.findOneAndDelete({
            _id: reminderId,
            clientId,
        });
        if (!reminder) {
            res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Reminder deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete reminder',
        });
    }
};
// ============================================================================
// MARK ALL REMINDERS AS READ (CLEAR ALL NOTIFICATIONS)
// ============================================================================
export const markAllRemindersAsRead = async (req, res) => {
    try {
        const { clientId } = req.auth;
        // Mark all reminders as read
        const result = await Reminder.updateMany({ clientId }, { read: true });
        res.status(200).json({
            success: true,
            message: `Marked ${result.modifiedCount} notifications as read`,
            modifiedCount: result.modifiedCount,
        });
    }
    catch (error) {
        console.error('Error marking all reminders as read:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to mark all reminders as read',
        });
    }
};
