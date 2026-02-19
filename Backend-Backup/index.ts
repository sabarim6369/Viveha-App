import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// @ts-ignore
import cors from 'cors';
import { connectDB } from './src/config/db.ts';

// Import routes
import otpRoutes from './src/api/routes/otpRoutes.ts';
import mockOtpRouter from './src/api/routes/mockOtpRoutes.ts';
import authRoutes from './src/api/routes/authRoutes.ts';
import clientRoutes from './src/api/routes/clientRoutes.ts';
import businessRoutes from './src/api/routes/businessRoutes.ts';
import dashboardRoutes from './src/api/routes/dashboardRoutes.ts';
import adminRoutes from './src/api/routes/adminRoutes.ts';
import syncRoutes from './src/api/routes/syncRoutes.ts';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

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

// Admin Routes (maintenance)
app.use('/api/admin', adminRoutes);

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

// ============================================================================
// START SERVER
// ============================================================================
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 Server started successfully!                          ║
║   📡 Port: ${PORT}                                          ║
║   🗄️  Database: MongoDB                                     ║
║   ⏰ Time: ${new Date().toISOString()}                     ║
╚════════════════════════════════════════════════════════════╝

🔗 API Endpoints:
   └─ http://localhost:${PORT}/api

Available Routes:
   
  Authentication & OTP:
  ├─ POST   /api/otp/send              - Send OTP
   ├─ POST   /api/auth/register         - Register Client
   ├─ POST   /api/auth/login            - Login Client
   ├─ POST   /api/auth/logout           - Logout Client
   └─ GET    /api/auth/client/:id       - Get Client Details
   
   Item Groups:
   ├─ POST   /api/business/item-groups                    - Create Item Group
   ├─ GET    /api/business/item-groups/:clientId          - Get Item Groups
   ├─ PUT    /api/business/item-groups/:clientId/:groupId - Update Item Group
   └─ DELETE /api/business/item-groups/:clientId/:groupId - Delete Item Group
   
   Items (with stock):
   ├─ POST   /api/business/items                      - Create Item
   ├─ GET    /api/business/items/:clientId            - Get Items
   ├─ PUT    /api/business/items/:clientId/:itemId    - Update Item
   └─ DELETE /api/business/items/:clientId/:itemId    - Delete Item
   
  Client Customers (with name and phone):
   ├─ POST   /api/business/client-customers                              - Create clientCustomer
   ├─ GET    /api/business/client-customers/:clientId                    - Get clientCustomers
   ├─ GET    /api/business/client-customers/:clientId/:phone             - Get by Phone
   ├─ PUT    /api/business/client-customers/:clientId/:clientCustomerId  - Update clientCustomer
   └─ DELETE /api/business/client-customers/:clientId/:clientCustomerId  - Delete clientCustomer
   
   Cart:
   ├─ POST   /api/business/carts           - Create Cart
   ├─ POST   /api/business/carts/add-item  - Add to Cart
   ├─ POST   /api/business/carts/remove-item - Remove from Cart
   ├─ GET    /api/business/carts/:cartId   - Get Cart
   └─ POST   /api/business/carts/clear     - Clear Cart
   
    Invoices (with client clientCustomer & item details):
   ├─ POST   /api/business/invoices/generate         - Generate Invoice
   ├─ GET    /api/business/invoices/:clientId        - Get Invoices
   ├─ POST   /api/business/invoices/pay              - Record Payment
    ├─ GET    /api/business/invoices/:invoiceId/payments?clientId= - Get Payments
    ├─ GET    /api/business/purchase-history/:clientId   - Get Purchase History
    ├─ GET    /api/business/pending-invoices/:clientId   - Get Pending Invoices
    ├─ GET    /api/business/pending-invoices/:clientId/:clientCustomerId - Pending by clientCustomer
    └─ GET    /api/business/paid-invoices/:clientId/:clientCustomerId - Paid by clientCustomer
   
    System:
   └─ GET    /api/health                - Health Check
    ├─ POST   /api/readytosync           - Ready-to-sync check
    └─ POST   /api/sync                  - Offline data sync

System is ready to handle requests!
      `);
        });
    } catch (error: any) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

export default app;
