import express from 'express';
import {
    createItemGroupController,
    getItemGroupsController,
    updateItemGroupController,
    deleteItemGroupController,
    createItemController,
    getItemsController,
    updateItemController,
    deleteItemController,
} from './controller.ts';
import {
    createclientCustomerController,
    getclientCustomersController,
    getclientCustomerByPhoneController,
    updateclientCustomerController,
    deleteclientCustomerController,
    getClientCustomerProfileController,
} from './controller.ts';
import {
    createCartController,
    addToCartController,
    removeFromCartController,
    getCartController,
    clearCartController,
} from './controller.ts';
import {
    generateInvoiceController,
    generateInvoiceWithProductsController,
    getInvoicesController,
    recordPaymentController,
    getPaymentsController,
    getPurchaseHistoryController,
    getPendingInvoicesController,
    getPaymentReportController,
    getPendingInvoicesByClientCustomerController,
    getPaidInvoicesByClientCustomerController,
} from './controller.ts';
import { authenticateToken } from '../../middleware/authMiddleware.ts';

const router = express.Router();

// All business routes require an active authenticated session
router.use(authenticateToken);

// ============================================================================
// ITEM GROUP ROUTES
// ============================================================================

/**
 * @route   POST /api/business/item-groups
 * @desc    Create new item group
 * @body    { clientId: string, name: string, description?: string }
 */
router.post('/item-groups', createItemGroupController);

/**
 * @route   GET /api/business/item-groups/:clientId
 * @desc    Get all item groups for client
 */
router.get('/item-groups/:clientId', getItemGroupsController);

/**
 * @route   PUT /api/business/item-groups/:clientId/:groupId
 * @desc    Update item group
 */
router.put('/item-groups/:clientId/:groupId', updateItemGroupController);

/**
 * @route   DELETE /api/business/item-groups/:clientId/:groupId
 * @desc    Delete item group
 */
router.delete('/item-groups/:clientId/:groupId', deleteItemGroupController);

// ============================================================================
// ITEM ROUTES
// ============================================================================

/**
 * @route   POST /api/business/items
 * @desc    Create new item
 * @body    { clientId: string, name: string, price: number, unit?: string, groupId?: string, description?: string }
 */
router.post('/items', createItemController);

/**
 * @route   GET /api/business/items/:clientId
 * @desc    Get all items for client (optionally filter by group)
 * @query   { groupId?: string }
 */
router.get('/items/:clientId', getItemsController);

/**
 * @route   PUT /api/business/items/:clientId/:itemId
 * @desc    Update item
 */
router.put('/items/:clientId/:itemId', updateItemController);

/**
 * @route   DELETE /api/business/items/:clientId/:itemId
 * @desc    Delete (deactivate) item
 */
router.delete('/items/:clientId/:itemId', deleteItemController);

// ============================================================================
// CLIENT CUSTOMER ROUTES (clientCustomers with name and phone)
// ============================================================================

/**
 * @route   POST /api/business/client-customers
 * @desc    Create or update client customer
 * @body    { clientId: string, name: string, phone: string }
 */
router.post('/client-customers', createclientCustomerController);

/**
 * @route   GET /api/business/client-customers/:clientId
 * @desc    Get all client customers for client
 */
router.get('/client-customers/:clientId', getclientCustomersController);

/**
 * @route   GET /api/business/client-customers/:clientId/:phone
 * @desc    Get client customer by phone
 */
router.get(
    '/client-customers/:clientId/:phone',
    getclientCustomerByPhoneController,
);

/**
 * @route   PUT /api/business/client-customers/:clientId/:clientCustomerId
 * @desc    Update client customer
 */
router.put(
    '/client-customers/:clientId/:clientCustomerId',
    updateclientCustomerController,
);

/**
 * @route   DELETE /api/business/client-customers/:clientId/:clientCustomerId
 * @desc    Delete client customer
 */
router.delete(
    '/client-customers/:clientId/:clientCustomerId',
    deleteclientCustomerController,
);

/**
 * @route   GET /api/business/client-customers/:clientId/:clientCustomerId/profile
 * @desc    Get client customer profile with invoices and payments
 */
router.get(
    '/client-customers/:clientId/:clientCustomerId/profile',
    getClientCustomerProfileController,
);

// ============================================================================
// CART ROUTES
// ============================================================================

/**
 * @route   POST /api/business/carts
 * @desc    Create new cart
 * @body    { clientId: string, clientCustomerPhone?: string }
 */
router.post('/carts', createCartController);

/**
 * @route   POST /api/business/carts/add-item
 * @desc    Add item to cart
 * @body    { cartId: string, itemId: string, itemName: string, unitPrice: number, quantity: number }
 */
router.post('/carts/add-item', addToCartController);

/**
 * @route   POST /api/business/carts/remove-item
 * @desc    Remove item from cart
 * @body    { cartId: string, cartItemId: string }
 */
router.post('/carts/remove-item', removeFromCartController);

/**
 * @route   GET /api/business/carts/:cartId
 * @desc    Get cart details with items
 */
router.get('/carts/:cartId', getCartController);

/**
 * @route   POST /api/business/carts/clear
 * @desc    Clear cart
 * @body    { cartId: string }
 */
router.post('/carts/clear', clearCartController);

// ============================================================================
// INVOICE & PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/business/invoices/generate
 * @desc    Generate invoice (paid = total)
 * @body    { clientId: string, clientCustomerId?: string, cartId: string, totalAmount: number, paidAmount: number, notes?: string }
 */
router.post('/invoices/generate', generateInvoiceController);
router.post(
    '/invoices/generatewithproducts',
    generateInvoiceWithProductsController,
);

/**
 * @route   GET /api/business/invoices/:clientId
 * @desc    Get all invoices for client
 */
router.get('/invoices/:clientId', getInvoicesController);

/**
 * @route   POST /api/business/invoices/pay
 * @desc    Record a payment against an invoice (supports multiple payments)
 * @body    { clientId: string, invoiceId: string, amount: number, method?: string, note?: string }
 */
router.post('/invoices/pay', recordPaymentController);

/**
 * @route   GET /api/business/invoices/:invoiceId/payments
 * @desc    Get payments for an invoice (scoped by clientId)
 * @query   { clientId: string }
 */
router.get('/invoices/:invoiceId/payments', getPaymentsController);

/**
 * @route   GET /api/business/purchase-history/:clientId
 * @desc    Get purchase history (optionally filter by client clientCustomer)
 * @query   { clientCustomerId?: string }
 */
router.get('/purchase-history/:clientId', getPurchaseHistoryController);

/**
 * @route   GET /api/business/pending-invoices/:clientId
 * @desc    Get pending invoices (unpaid/partial)
 */
router.get('/pending-invoices/:clientId', getPendingInvoicesController);

/**
 * @route   GET /api/business/pending-invoices/:clientId/:clientCustomerId
 * @desc    Get pending invoices for a client customer
 * @query   { clientCustomerPhone?: string }
 */
router.get(
    '/pending-invoices/:clientId/:clientCustomerId',
    getPendingInvoicesByClientCustomerController,
);

/**
 * @route   GET /api/business/paid-invoices/:clientId/:clientCustomerId
 * @desc    Get fully paid invoices for a client customer
 * @query   { clientCustomerPhone?: string }
 */
router.get(
    '/paid-invoices/:clientId/:clientCustomerId',
    getPaidInvoicesByClientCustomerController,
);

/**
 * @route   GET /api/business/payment-report/:clientId
 * @desc    Get payment breakdown and summary
 */
router.get('/payment-report/:clientId', getPaymentReportController);

export default router;
