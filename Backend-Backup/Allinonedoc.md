# All-in-One Backend Documentation

## 1. Overview
This document provides a comprehensive guide to the Viveha backend, covering both the high-level workflows and the detailed API specifications.

**Base URL**:
- Development: `http://localhost:10000/api`
- Production: `https://viveha-backend.onrender.com/api`

---

## 2. Workflows

### 2.1 Authentication & Onboarding
The entry point for any business user.
1.  **Request OTP**: User enters phone number. App calls `/api/otp/send`.
2.  **Verify & Register**: User enters OTP. App calls `/api/auth/register` with phone, OTP, and business details.
    -   *Result*: New Client created, JWT token issued.
3.  **Login**: Returning users call `/api/auth/login` with phone and OTP.
    -   *Result*: JWT token issued.

### 2.2 Business Setup (Inventory)
Once logged in, the user sets up their catalog.
1.  **Create Item Groups**: Organize products (e.g., "Vegetables", "Dairy").
    -   API: `POST /api/business/item-groups`
2.  **Add Items**: Create individual products linked to groups.
    -   API: `POST /api/business/items`
3.  **Manage Customers**: Add frequent customers for quick billing.
    -   API: `POST /api/business/client-customers`

### 2.3 Sales Workflow (Point of Sale)
The core billing loop.
1.  **Create Cart**: Initialize a new transaction.
    -   API: `POST /api/business/carts`
2.  **Add Items**: Scan or select items to add to the cart.
    -   API: `POST /api/business/carts/add-item`
3.  **Generate Invoice**: Finalize the cart into an invoice.
    -   API: `POST /api/business/invoices/generate`
    -   *Logic*: Updates stock, clears cart, records purchase history.
4.  **Record Payment**: Mark the invoice as paid (partial or full).
    -   API: `POST /api/business/invoices/pay`

### 2.4 Offline Sync (Mobile App)
For devices operating with intermittent internet.
1.  **Check Readiness**: App calls `/api/readytosync` to verify session.
2.  **Sync Data**: App pushes local changes (invoices, new items) to backend.
    -   API: `POST /api/sync`
    -   *Behavior*: Receives full updated dataset (items, customers, invoices) from server to ensure consistency.

---

## 3. API Reference

### 3.1 Authentication Module

#### Send OTP
-   **URL**: `POST /api/otp/send`
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "purpose": "register" // or "login"
    }
    ```
-   **Description**: Triggers an SMS OTP to the user. Returns success status.

#### Register Client
-   **URL**: `POST /api/auth/register`
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "otp": "1234",
      "ownerName": "John Doe",
      "businessName": "John's Mart",
      "deviceId": "uuid-v4", // Optional
      "profileUrl": "http://..." // Optional
    }
    ```
-   **Description**: Validates OTP and creates a new Client account. Returns JWT token.

#### Login
-   **URL**: `POST /api/auth/login`
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "otp": "1234",
      "deviceId": "uuid-v4" // Optional
    }
    ```
-   **Description**: Validates OTP and returns access token for existing users.

#### Logout
-   **URL**: `POST /api/auth/logout`
-   **Headers**: `Authorization: Bearer <token>`
-   **Body**: `{ "deviceSessionId": "..." }`
-   **Description**: Invalidates the current session.

---

### 3.2 Client Module

#### Get Client Details
-   **URL**: `GET /api/client/:clientId`
-   **Headers**: `Authorization: Bearer <token>`
-   **Description**: Fetches profile and business settings for the logged-in client.

#### Update Client Profile
-   **URL**: `PUT /api/client/:clientId`
-   **Headers**: `Authorization: Bearer <token>`
-   **Body**: `{ "businessName": "New Name", ... }` (Any profile field)
-   **Description**: Updates client account details.

---

### 3.3 Business Module

#### Item Groups
-   **Create**: `POST /api/business/item-groups`
    -   Body: `{ "clientId": "...", "name": "Group Name" }`
-   **Get All**: `GET /api/business/item-groups/:clientId`
-   **Update**: `PUT /api/business/item-groups/:clientId/:groupId`
-   **Delete**: `DELETE /api/business/item-groups/:clientId/:groupId`

#### Items
-   **Create**: `POST /api/business/items`
    -   Body:
        ```json
        {
          "clientId": "...",
          "name": "Apple",
          "price": 100,
          "stock": 50,
          "unit": "kg"
        }
        ```
-   **Get All**: `GET /api/business/items/:clientId`
-   **Update**: `PUT /api/business/items/:clientId/:itemId`
-   **Delete**: `DELETE /api/business/items/:clientId/:itemId`

#### Customers
-   **Create**: `POST /api/business/client-customers`
    -   Body: `{ "clientId": "...", "name": "Jane", "phone": "9988776655" }`
-   **Get All**: `GET /api/business/client-customers/:clientId`
-   **Get By Phone**: `GET /api/business/client-customers/:clientId/:phone`

#### Carts
-   **Create**: `POST /api/business/carts`
    -   Body: `{ "clientId": "...", "clientCustomerPhone": "..." }`
-   **Add Item**: `POST /api/business/carts/add-item`
    -   Body:
        ```json
        {
          "cartId": "...",
          "itemId": "...",
          "itemName": "Apple",
          "unitPrice": 100,
          "quantity": 2
        }
        ```
-   **Remove Item**: `POST /api/business/carts/remove-item`
-   **Get Cart**: `GET /api/business/carts/:cartId`
-   **Clear Cart**: `POST /api/business/carts/clear`

#### Invoices & Payments
-   **Generate Invoice**: `POST /api/business/invoices/generate`
    -   Body:
        ```json
        {
          "clientId": "...",
          "cartId": "...",
          "paidAmount": 200, // Amount received immediately
          "notes": "..."
        }
        ```
-   **Record Payment**: `POST /api/business/invoices/pay`
    -   Body: `{ "clientId": "...", "invoiceId": "...", "amount": 50 }`
-   **Get Invoices**: `GET /api/business/invoices/:clientId`
-   **Purchase History**: `GET /api/business/purchase-history/:clientId`
-   **Pending Invoices**: `GET /api/business/pending-invoices/:clientId`

---

### 3.4 Dashboard Module

-   **Get Summary**: `GET /api/dashboard/summary` (Sales, Revenue, etc.)
-   **Get Sales Trends**: `GET /api/dashboard/sales-trends`
-   **Get Top Items**: `GET /api/dashboard/top-items`

---

### 3.5 Sync Module

#### Check Ready
-   **URL**: `POST /api/readytosync`
-   **Description**: Simple health check for sync capability.

#### Sync Data
-   **URL**: `POST /api/sync`
-   **Body**:
    ```json
    {
      "clientId": "...",
      "invoices": [ ...array of offline invoices... ],
      "items": [ ...array of new offline items... ]
    }
    ```
-   **Description**: Accepts offline data (currently logs it) and returns the full server-side dataset (Items, Groups, Customers, Invoices) to update the client.
