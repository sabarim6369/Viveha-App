# Backend API Documentation

## Overview

This documentation details the API endpoints for the Viveha backend. The API is built using Node.js and Express, with MongoDB as the database.

## Base URL

- **Development**: `http://localhost:10000/api`
- **Production**: `https://viveha-backend.onrender.com/api`

## Authentication

The API uses a combination of OTP-based authentication and JWT (JSON Web Tokens).

1.  **OTP**: Used for initial registration and login.
2.  **JWT**: Issued after successful login/registration. Must be included in the `Authorization` header as `Bearer <token>` for protected routes.

---

## Endpoints

### 1. Authentication & OTP

#### 1.1 Send OTP
Sends an OTP to the specified phone number.

-   **URL**: `/otp/send`
-   **Method**: `POST`
-   **Auth**: None
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "purpose": "register" // or "login"
    }
    ```
-   **Response**:
    ```json
    {
      "success": true,
      "message": "OTP sent successfully",
      "phoneNumber": "9876543210",
      "expiresInSeconds": 600
    }
    ```

#### 1.2 Send Mock OTP (Test Only)
Sends a fixed mock OTP (usually "1234") without sending an actual SMS.

-   **URL**: `/mockotp/send`
-   **Method**: `POST`
-   **Auth**: None
-   **Body**: Same as `/otp/send`
-   **Response**: Same as `/otp/send`

#### 1.3 Register Client
Registers a new business client.

-   **URL**: `/auth/register`
-   **Method**: `POST`
-   **Auth**: None
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "otp": "1234",
      "ownerName": "John Doe",
      "businessName": "John's Shop",
      "deviceId": "device-uuid", // Optional
      "shopName": "John's Shop Display Name", // Optional
      "location": "123 Street", // Optional
      "city": "City", // Optional
      "state": "State", // Optional
      "gstin": "GSTIN123", // Optional
      "profileUrl": "http://img.url" // Optional
    }
    ```
-   **Response**:
    ```json
    {
      "success": true,
      "message": "Client registered successfully",
      "clientId": "...",
      "token": "...",
      "deviceSessionId": "..."
    }
    ```

#### 1.4 Login Client
Logs in an existing client.

-   **URL**: `/auth/login`
-   **Method**: `POST`
-   **Auth**: None
-   **Body**:
    ```json
    {
      "phoneNumber": "9876543210",
      "otp": "1234",
      "deviceId": "device-uuid" // Optional
    }
    ```
-   **Response**:
    ```json
    {
      "success": true,
      "message": "OTP login successful",
      "token": "...",
      "clientId": "...",
      "deviceSessionId": "..."
    }
    ```

#### 1.5 Logout Client
Logs out the client and invalidates the session.

-   **URL**: `/auth/logout`
-   **Method**: `POST`
-   **Auth**: Bearer Token
-   **Body**:
    ```json
    {
      "deviceSessionId": "..." // Optional, inferred from token if not provided
    }
    ```
-   **Response**:
    ```json
    {
      "success": true,
      "message": "Logout successful"
    }
    ```

---

### 2. Client Management

#### 2.1 Get Client Details
-   **URL**: `/client/:clientId`
-   **Method**: `GET`
-   **Auth**: Bearer Token
-   **Response**: Client details object.

#### 2.2 Update Client Profile
-   **URL**: `/client/:clientId`
-   **Method**: `PUT`
-   **Auth**: Bearer Token
-   **Body**: Fields to update (e.g., `ownerName`, `businessName`, `profileUrl`, etc.)
-   **Response**: Updated client object.

---

### 3. Business Resources

#### 3.1 Item Groups

-   **Create Group**: `POST /business/item-groups`
    -   Body: `{ "clientId": "...", "name": "Group Name", "description": "..." }`
-   **Get Groups**: `GET /business/item-groups/:clientId`
-   **Update Group**: `PUT /business/item-groups/:clientId/:groupId`
-   **Delete Group**: `DELETE /business/item-groups/:clientId/:groupId`

#### 3.2 Items

-   **Create Item**: `POST /business/items`
    -   Body: `{ "clientId": "...", "name": "Item Name", "price": 100, "stock": 50, "unit": "kg", "groupId": "...", "description": "..." }`
-   **Get Items**: `GET /business/items/:clientId`
    -   Query: `?groupId=...` (optional)
-   **Update Item**: `PUT /business/items/:clientId/:itemId`
-   **Delete Item**: `DELETE /business/items/:clientId/:itemId`

#### 3.3 Client Customers

-   **Create Customer**: `POST /business/client-customers`
    -   Body: `{ "clientId": "...", "name": "Customer Name", "phone": "...", "address": "...", "emailId": "...", "gstNo": "..." }`
-   **Get Customers**: `GET /business/client-customers/:clientId`
-   **Get Customer by Phone**: `GET /business/client-customers/:clientId/:phone`
-   **Update Customer**: `PUT /business/client-customers/:clientId/:clientCustomerId`
-   **Delete Customer**: `DELETE /business/client-customers/:clientId/:clientCustomerId`

#### 3.4 Carts

-   **Create Cart**: `POST /business/carts`
    -   Body: `{ "clientId": "...", "clientCustomerPhone": "..." }`
-   **Add to Cart**: `POST /business/carts/add-item`
    -   Body: `{ "cartId": "...", "itemId": "...", "itemName": "...", "unitPrice": 100, "quantity": 1 }`
-   **Remove from Cart**: `POST /business/carts/remove-item`
    -   Body: `{ "cartId": "...", "cartItemId": "..." }`
-   **Get Cart**: `GET /business/carts/:cartId`
-   **Clear Cart**: `POST /business/carts/clear`
    -   Body: `{ "cartId": "..." }`

#### 3.5 Invoices & Payments

-   **Generate Invoice**: `POST /business/invoices/generate`
    -   Body: `{ "clientId": "...", "cartId": "...", "totalAmount": ..., "paidAmount": ..., "notes": "..." }`
-   **Generate Invoice (Direct Products)**: `POST /business/invoices/generatewithproducts`
    -   Body: `{ "clientId": "...", "products": [...], ... }`
-   **Get Invoices**: `GET /business/invoices/:clientId`
-   **Record Payment**: `POST /business/invoices/pay`
    -   Body: `{ "clientId": "...", "invoiceId": "...", "amount": ..., "method": "...", "note": "..." }`
-   **Get Invoice Payments**: `GET /business/invoices/:invoiceId/payments?clientId=...`
-   **Purchase History**: `GET /business/purchase-history/:clientId`
    -   Query: `?clientCustomerId=...` or `?clientCustomerPhone=...`
-   **Pending Invoices (All)**: `GET /business/pending-invoices/:clientId`
-   **Pending Invoices (Customer)**: `GET /business/pending-invoices/:clientId/:clientCustomerId`. Query `?clientCustomerPhone=...`
-   **Paid Invoices (Customer)**: `GET /business/paid-invoices/:clientId/:clientCustomerId`
-   **Payment Report**: `GET /business/payment-report/:clientId`

---

### 4. Dashboard

-   **Summary**: `GET /dashboard/summary`
-   **Sales Trends**: `GET /dashboard/sales-trends?months=6`
-   **Top Items**: `GET /dashboard/top-items?limit=5`
-   **Full Dashboard**: `GET /dashboard?months=6&limit=5`

---

### 5. Offline Sync

-   **Check Ready**: `POST /readytosync`
-   **Sync Data**: `POST /sync`
    -   Body: JSON payload containing offline changes to start syncing.

---

### 6. Admin

-   **Flush Database**: `POST /admin/flush-db`
    -   Header: `X-Admin-Token: ...`

## Error Handling

Errors are returned in the following format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common status codes:
-   `400`: Bad Request (Validation failed)
-   `401`: Unauthorized (Invalid token/otp)
-   `404`: Not Found
-   `500`: Internal Server Error
