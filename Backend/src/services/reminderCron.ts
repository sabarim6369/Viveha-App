import { Reminder } from '../models/Reminder.js';

// ============================================================================
// CRON JOB: PROCESS DUE REMINDERS
// ============================================================================
export const processDueReminders = async (): Promise<void> => {
    try {
        console.log('🔔 [Cron] Running reminder check...');

        // Get current date at start of day (midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get end of day
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // Find all pending reminders due today
        const dueReminders = await Reminder.find({
            status: 'pending',
            reminderDate: {
                $gte: today,
                $lte: endOfDay,
            },
        }).populate('clientId', 'phoneNumber ownerName businessName');

        console.log(`📊 [Cron] Found ${dueReminders.length} reminders due today`);

        if (dueReminders.length === 0) {
            return;
        }

        // Process each reminder
        for (const reminder of dueReminders) {
            try {
                console.log(`📤 [Cron] Processing reminder ${reminder._id} for ${reminder.customerName}`);

                // Here you would integrate with notification service
                // For now, we'll just mark it as sent and create a notification
                
                // Update reminder status to 'sent'
                reminder.status = 'sent';
                reminder.sentAt = new Date();
                await reminder.save();

                console.log(`✅ [Cron] Reminder ${reminder._id} marked as sent`);

                // In a real implementation, you would:
                // 1. Send push notification to the client's device
                // 2. Send SMS to customer (optional)
                // 3. Send email notification (optional)
                // 4. Log the notification in a notifications table

            } catch (error: any) {
                console.error(`❌ [Cron] Failed to process reminder ${reminder._id}:`, error.message);
                
                // Mark as failed
                reminder.status = 'failed';
                reminder.failureReason = error.message;
                await reminder.save();
            }
        }

        console.log('✅ [Cron] Reminder processing complete');
    } catch (error: any) {
        console.error('❌ [Cron] Error in processDueReminders:', error);
    }
};

// ============================================================================
// CRON JOB: CLEANUP OLD REMINDERS
// ============================================================================
export const cleanupOldReminders = async (): Promise<void> => {
    try {
        console.log('🧹 [Cron] Cleaning up old reminders...');

        // Delete reminders older than 90 days that are sent/failed/cancelled
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const result = await Reminder.deleteMany({
            status: { $in: ['sent', 'failed', 'cancelled'] },
            createdAt: { $lt: ninetyDaysAgo },
        });

        console.log(`✅ [Cron] Deleted ${result.deletedCount} old reminders`);
    } catch (error: any) {
        console.error('❌ [Cron] Error in cleanupOldReminders:', error);
    }
};

// ============================================================================
// SCHEDULE CRON JOBS
// ============================================================================
export const startReminderCronJobs = (): void => {
    console.log('🕐 [Cron] Starting reminder cron jobs...');

    // Run reminder check every hour
    const checkInterval = 60 * 60 * 1000; // 1 hour
    setInterval(processDueReminders, checkInterval);

    // Run on startup
    processDueReminders();

    // Cleanup old reminders once a day (at 2 AM)
    const now = new Date();
    const nextCleanup = new Date(now);
    nextCleanup.setHours(2, 0, 0, 0);
    
    if (nextCleanup < now) {
        nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    const timeUntilCleanup = nextCleanup.getTime() - now.getTime();
    
    setTimeout(() => {
        cleanupOldReminders();
        // Then run every 24 hours
        setInterval(cleanupOldReminders, 24 * 60 * 60 * 1000);
    }, timeUntilCleanup);

    console.log('✅ [Cron] Reminder cron jobs started');
};
