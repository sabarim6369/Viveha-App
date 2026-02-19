# Backend Flow & Process Description

This document describes the logical flow of operations within the Viveha backend system, explaining how different components interact to support the business processes.

## 1. Authentication & Onboarding Flow

The system uses a phone-number-based authentication system secured by OTP (One-Time Password).

-   **Registration**: A new user (shop owner) enters their phone number. The backend generates an OTP. Upon verifying the OTP, the user registers their business details (Name, Shop Name, Location, etc.). The backend creates a new `Client` record and issues a JWT (JSON Web Token) for the session.
-   **Login**: Returning users enter their phone number and request an OTP. Upon verification, the backend checks if the phone number exists. If valid, it issues a new JWT and logs the user in.
-   **Session Management**: All subsequent requests use the JWT mainly to identify the `clientId` and `deviceSessionId`. This ensures data isolation between different businesses.

## 2. Business Configuration Flow

Once logged in, the shop owner sets up their inventory and business settings.

-   **Profile Setup**: The user can update their business profile, including logo, address, and GST number.
-   **Inventory Organization**: The user first creates **Item Groups** (categories) to organize their products (e.g., "Dairy", "Snacks").
-   **Item Creation**: Valid items are added under these groups. Each item has properties like price, stock level, and unit type.
-   **Customer Settings**: The business configures which customer details they want to collect (e.g., enabling/disabling email or GST collection for customers).

## 3. The Sales Process (Point of Sale)

This is the core operational flow where sales happen.

1.  **Cart Creation**: A new sale starts by creating a temporary **Cart**. This can be associated with a specific customer or remains anonymous.
2.  **Adding Items**: The shopkeeper adds items to the cart. The backend validates item availability and retrieves current prices.
3.  **Invoice Generation**: Once the cart is finalized, the backend generates an **Invoice**.
    -   This converts the temporary cart into a permanent invoice record.
    -   It calculates totals, discounts (if any), and taxes.
    -   Stock levels for the sold items are automatically deducted.
4.  **Payment Recording**: The system records payments against the invoice. A sale can be fully paid, partially paid (credit), or unpaid. Multiple payment modes (Cash, UPI, etc.) are supported.

## 4. Customer Management Flow

The system allows managing a database of customers for credit tracking and history.

-   **Customer Directory**: Businesses can creates and manage **Client Customers**.
-   **Purchase History**: The backend tracks every purchase made by a specific customer, allowing the shopkeeper to view a customer's purchase history and pending dues.
-   **Credit/Ledger**: By querying unpaid or partially paid invoices for a customer, the system effectively maintains a credit ledger for them.

## 5. Dashboard & Reporting Flow

To help the business owner understand their performance:

-   **Real-time Summary**: The dashboard aggregates data to show daily/monthly sales totals, total invoices, and active customer counts.
-   **Trends**: The system calculates sales trends over time (e.g., last 6 months) to visualize growth.
-   **Top Items**: The backend analyzes invoice data to identify best-selling products.

## 6. Offline Synchronization Flow

For apps operating in unreliable network conditions, the backend supports an offline-first approach.

-   **Data Queuing**: The frontend collects actions (sales, customer creations) while offline.
-   **Sync Process**: When connectivity is restored, the frontend sends a batch of offline actions to the `/api/sync` endpoint.
-   **Conflict Resolution**: The backend processes these actions, ensures data consistency (e.g., adjusting stock for offline sales), and returns the latest consistent state of the data to the device.
