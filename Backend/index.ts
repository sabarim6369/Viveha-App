import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// @ts-ignore
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { startReminderCronJobs } from './src/services/reminderCron.js';

// Import routes
import otpRoutes from './src/apis/otp/route.js';
import mockOtpRouter from './src/apis/mockOtp/route.js';
import authRoutes from './src/apis/auth/route.js';
import clientRoutes from './src/apis/client/route.js';
import businessRoutes from './src/apis/business/route.js';
import dashboardRoutes from './src/apis/dashboard/route.js';
import adminRoutes from './src/apis/admin/route.js';
import syncRoutes from './src/apis/sync/route.js';
import reminderRoutes from './src/apis/reminder/route.js';
import uploadRoutes from './src/apis/upload/route.js';
import insightsRoutes from './src/apis/insights/route.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = Number(process.env.PORT) || 10000;
// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// ============================================================================
// ROUTES
// ============================================================================

// OTP Routes
app.use('/api/otp', otpRoutes);

// OTP Routes
app.use('/api/mockotp', mockOtpRouter);

// Auth Routes
app.use('/api/auth', authRoutes);

// Client Routes (profile management)
app.use('/api/client', clientRoutes);
// Backward-compatible client routes under auth
app.use('/api/auth/client', clientRoutes);

// Business Routes (Items, Carts, Invoices, etc.)
app.use('/api/business', businessRoutes);

// Dashboard Routes (summary, trends, top items)
app.use('/api/dashboard', dashboardRoutes);

// Sync Routes (Offline sync)
app.use('/api', syncRoutes);

// Reminder Routes
app.use('/api/reminders', reminderRoutes);

// Admin Routes (maintenance)
app.use('/api/admin', adminRoutes);

// Upload Routes
app.use('/api/upload', uploadRoutes);

// Insights Routes (Page time tracking)
app.use('/api/insights', insightsRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});


const startServer = async () => {
    try {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

        await connectDB();
        startReminderCronJobs();
    } catch (error) {
        console.error("Startup error:", error);
    }
};

// Start the server
startServer();

export default app;
