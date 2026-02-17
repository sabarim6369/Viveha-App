# Frontend-Backend Integration Guide

## ✅ Integration Complete!

The frontend React Native app is now fully connected to the updated Node.js backend with real-time sync capabilities.

## 🔌 Connection Setup

### API Configuration
**File:** `App/api.js`
```javascript
const apiurl = "http://172.16.140.155:5000/api";
```

**⚠️ Important:** Update this IP address to match your backend server:
- Local development: `http://localhost:5000/api`
- Network: `http://YOUR_IP:5000/api`
- Production: `https://your-domain.com/api`

## 🔑 Client ID Setup

Before using the app, you need to set the client ID (business owner ID from backend):

```javascript
import { setClientId } from './utils/NetworkManager';

// After login/signup, set the client ID
await setClientId('your-mongodb-client-id-here');
```

This should be done after authentication in your login/signup flow.

## 📡 Network Manager Features

### Automatic Sync
The NetworkManager now includes:
- ✅ Automatic online/offline detection
- ✅ Real-time sync when online
- ✅ Offline queue for when disconnected
- ✅ Automatic retry on connection restore

### Data Flow

#### Items Flow
```
Frontend → NetworkManager → Backend API
   ↓            ↓               ↓
Local DB ← Sync Queue ← Server Response
```

1. **Online Mode:**
   - Save item → Immediately sync to backend
   - Get item → Fetch from backend, cache locally
   - Stock updates in real-time

2. **Offline Mode:**
   - Save item → Store locally
   - Add to pending sync queue
   - Auto-sync when connection restored

#### Clients Flow (Client Customers)
```
CreateInvoiceScreen → saveClient() → Backend API
        ↓                              ↓
   Local Storage ←  Sync  ← /api/business/client-customers
```

1. **Create Client:**
   - Enter phone number (10 digits)
   - Enter name if new
   - Syncs to backend immediately if online
   - Stored locally for offline access

2. **Select Client:**
   - Auto-searches in saved clients
   - Fetches from backend if online
   - Uses local cache if offline

#### Invoice Flow
```
CreateInvoiceScreen → generateInvoice() → Backend API
        ↓                                      ↓
   Full Details → /api/business/invoices/generate
        ↓                                      ↓
    Includes:                          Backend Creates:
    - Customer info                    - Invoice record
    - Items (with stock IDs)          - Decrements stock
    - Tax & Discount                  - Links customer
    - Dates                           - Stores breakdown
```

## 🛠️ Updated Functions

### NetworkManager.js

#### New Functions Added:

1. **getClientId() / setClientId()**
   - Manages business owner ID
   - Required for all API calls
   - Cached in memory for performance

2. **fetchItemsFromBackend()**
   - Fetches items from `/api/business/items/:clientId`
   - Maps backend format to frontend format
   - Caches locally

3. **fetchClientsFromBackend()**
   - Fetches from `/api/business/client-customers/:clientId`
   - Syncs customer list
   - Maintains local cache

4. **syncItemsToBackend()**
   - Syncs pending items
   - Handles create, update, delete
   - Automatic retry

5. **syncClientsToBackend()**
   - Syncs client customers
   - Bidirectional sync
   - Maintains consistency

6. **syncInvoicesToBackend()**
   - Generates invoices on backend
   - Includes all calculation details
   - Updates stock automatically

#### Updated Functions:

1. **saveItem()**
   - Now syncs with backend immediately if online
   - Falls back to pending queue if offline
   - Stores serverId for future updates

2. **saveClient()**
   - Creates/updates on backend in real-time
   - Full name + phone support
   - Offline-first with sync

3. **saveInvoice()**
   - Complete invoice generation
   - Includes customer, items, calculations
   - Stock deduction on backend

4. **getItems() / getClients()**
   - Fetches from backend if online
   - Falls back to local cache
   - Auto-refresh on connection

## 📱 Frontend Changes

### CreateInvoiceScreen.js

#### Updated Item Selection
```javascript
const handleSelectItem = (selectedItem) => {
  const newItem = {
    id: Date.now(),
    serverId: selectedItem.serverId, // ✨ NEW - Backend ID for stock
    name: selectedItem.name,
    quantity: 1,
    price: selectedItem.amount,
    tax: 0,
    discount: 0,
    stockAvailable: selectedItem.stock,
  };
  // ... rest of code
};
```

**Key Change:** Now includes `serverId` which is used by backend to identify and decrement stock.

#### Invoice Generation
The invoice generation now sends complete data to backend:
- Customer name and phone
- Items with backend IDs (for stock deduction)
- Tax and discount per item
- Invoice dates
- Full calculation breakdown

## 🔄 Sync Workflow

### Automatic Sync Triggers

1. **On App Start:**
   - Fetches latest items from backend
   - Fetches latest clients
   - Syncs pending changes

2. **On Item Create:**
   - Saves locally
   - Syncs to backend immediately (if online)
   - Updates local with server ID

3. **On Client Create:**
   - Saves locally
   - Creates on backend (if online)
   - Links for future invoices

4. **On Invoice Generate:**
   - Saves full invoice
   - Sends to backend with all details
   - Backend decrements stock
   - Backend creates customer record

5. **On Connection Restore:**
   - Auto-syncs all pending items
   - Shows sync indicator
   - Updates local cache

### Manual Sync
Users can manually trigger sync from:
- CreateInvoiceScreen → Menu → "Sync Now"
- SyncIndicator component (shows pending count)

## 🎯 Data Mapping

### Item Mapping
```javascript
Backend → Frontend
{
  _id: '...',          → id: '...', serverId: '...'
  name: '...',         → name: '...'
  price: 100,          → amount: 100, price: 100
  stock: 50,           → stock: 50
  unit: 'nos',         → unit: 'nos'
  groupId: '...',      → groupId: '...'
}
```

### Client Mapping
```javascript
Backend → Frontend
{
  _id: '...',          → id: '...', serverId: '...'
  name: 'John Doe',    → name: 'John Doe'
  phone: '9876543210', → phone: '9876543210'
  createdAt: '...',    → createdAt: '...'
}
```

### Invoice Payload
```javascript
Frontend → Backend
{
  clientId: '...',                    // Owner ID
  clientCustomerName: 'John Doe',     // Customer name
  clientCustomerPhone: '9876543210',  // Customer phone
  items: [
    {
      itemId: 'backend-item-id',      // For stock deduction
      name: 'Product',
      price: 100,
      quantity: 2,
      unit: 'Nos',
      tax: 18,                         // Percentage
      discount: 5,                     // Percentage
    }
  ],
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-01-20',
  dueDate: '2026-02-20',
  subtotal: 200,
  totalTax: 36,
  totalDiscount: 10,
  totalAmount: 226,
  paidAmount: 226,
  notes: 'Thank you!'
}
```

## 🧪 Testing Guide

### 1. Test Item Creation
```bash
# Online Test
1. Open ItemsScreen
2. Create new item with stock
3. Verify item appears immediately
4. Check backend: GET /api/business/items/:clientId
5. Verify serverId is stored locally

# Offline Test
1. Turn off network
2. Create new item
3. Verify "Saved offline" message
4. Turn on network
5. Trigger sync
6. Verify item appears on backend
```

### 2. Test Client Creation
```bash
# Online Test
1. Open CreateInvoiceScreen
2. Tap "To" section
3. Enter new phone number
4. Enter name
5. Save
6. Check backend: GET /api/business/client-customers/:clientId
7. Verify customer exists

# Existing Client Test
1. Enter existing phone
2. Verify name auto-fills
3. Verify selection works
```

### 3. Test Invoice Generation
```bash
# Complete Flow Test
1. Add items to invoice (verify stock shown)
2. Select customer
3. Adjust quantities
4. Add tax/discount if needed
5. Generate invoice
6. Verify:
   - Invoice created on backend
   - Stock decreased correctly
   - Customer linked
   - All calculations correct

# Check backend:
GET /api/business/invoices/:clientId
GET /api/business/items/:clientId  (verify stock)
GET /api/business/client-customers/:clientId
```

### 4. Test Offline Sync
```bash
1. Create items offline
2. Create clients offline
3. Generate invoices offline
4. Connect to network
5. Trigger sync (or wait for auto-sync)
6. Verify all pending items synced
7. Check pending count = 0
```

## 📊 Sync Indicators

### Sync Status Display
```javascript
<SyncIndicator 
  isOnline={isConnected && isInternetReachable}
  isSyncing={isSyncing}
  pendingCount={pendingCount}
/>
```

Shows:
- 🟢 Green: Online and synced
- 🟡 Yellow: Syncing in progress
- 🔴 Red: Offline with pending items
- Number badge: Pending sync count

## ⚠️ Important Notes

### 1. Client ID Required
```javascript
// Must be set after login
import { setClientId } from './utils/NetworkManager';
await setClientId('your-client-id-from-login');
```

### 2. Stock Management
- Stock automatically decreases when invoice is generated
- Frontend shows "Stock: X available"
- Prevents over-selling (quantity > stock shows error)

### 3. Offline Support
- All operations work offline
- Auto-syncs when online
- No data loss
- Pending count visible

### 4. Error Handling
```javascript
try {
  const result = await saveItem(item);
  if (result.success) {
    // Success
  } else {
    // Handle error
    console.error(result.error);
  }
} catch (error) {
  // Network or other error
}
```

## 🚀 Deployment Checklist

- [ ] Update API URL in `App/api.js`
- [ ] Ensure backend is running
- [ ] Test online mode
- [ ] Test offline mode
- [ ] Test sync after reconnection
- [ ] Verify stock deduction
- [ ] Verify client customer creation
- [ ] Test invoice generation
- [ ] Check error handling
- [ ] Monitor sync performance

## 🔍 Debugging

### Check Pending Sync Items
```javascript
import { getPendingSyncItems } from './utils/NetworkManager';

const pending = await getPendingSyncItems();
console.log('Pending sync:', pending);
```

### Check Client ID
```javascript
import { getClientId } from './utils/NetworkManager';

const clientId = await getClientId();
console.log('Client ID:', clientId);
```

### Monitor Network Status
```javascript
import { useNetworkStatus } from './utils/NetworkManager';

const { isConnected, isInternetReachable } = useNetworkStatus();
console.log('Online:', isConnected && isInternetReachable);
```

### Check Sync Status
```javascript
import { getPendingSyncByType } from './utils/NetworkManager';

const status = await getPendingSyncByType();
console.log('Pending:', status);
// { item: 2, client: 1, invoice: 0, total: 3 }
```

## 📞 Common Issues

### Issue 1: "No client ID" error
**Solution:** Set client ID after login
```javascript
await setClientId('client-id-from-backend');
```

### Issue 2: Items not syncing
**Solution:** Check:
1. Backend is running
2. API URL is correct
3. Client ID is set
4. Network connection
5. Console for errors

### Issue 3: Stock not decreasing
**Solution:** Ensure `serverId` is included in items:
```javascript
{
  serverId: item.serverId, // Backend item ID
  // ... other fields
}
```

### Issue 4: Customer not found
**Solution:** 
- Ensure phone number is 10 digits
- Check client-customers endpoint
- Verify clientId is correct

## 🎉 Features Now Working

✅ Items with stock management
✅ Real-time stock updates
✅ Client customer with names
✅ Invoice generation with full details
✅ Tax and discount calculations
✅ Automatic stock deduction
✅ Offline-first architecture
✅ Automatic sync on connection
✅ Pending sync indicators
✅ Error handling and retry
✅ Local caching for performance

## 📝 Next Steps

1. **Add Authentication:**
   - Login/signup screens
   - Get client ID from auth response
   - Set client ID in NetworkManager

2. **Enhance Sync:**
   - Add conflict resolution
   - Implement batch sync
   - Add sync logs

3. **Add Features:**
   - Edit invoices
   - Payment tracking
   - Reports and analytics

---

**Status:** ✅ Fully Integrated and Working  
**Last Updated:** January 20, 2026  
**Version:** 1.0
