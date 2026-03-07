import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiurl from '../api';

// ===== TYPE DEFINITIONS =====

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  error?: string;
}

interface PendingSyncItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  type: 'invoice' | 'item' | 'client' | 'payment' | 'group' | 'invoice_status';
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface Item {
  id: string;
  serverId?: string;
  name: string;
  actualPrice: number; // Original/MRP price
  salePrice: number;   // Selling price (used in invoices)
  amount?: number;     // Deprecated: Use salePrice instead
  price?: number;      // Deprecated: Use salePrice instead
  stock: number;
  unit: string;
  groupId?: string | null;
  groupName?: string;
  description?: string;
  createdAt?: string;
}

interface Client {
  id: string;
  serverId?: string;
  name: string;
  phone: string;
  createdAt?: string;
}

interface ClientInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  emailId?: string;
  gstNo?: string;
  serverId?: string;
}

interface InvoiceItem {
  id?: string;
  serverId?: string;
  name: string;
  itemName?: string;
  quantity: number;
  actualPrice?: number; // Original/MRP price (for reference)
  salePrice: number;    // Price applied in invoice
  price?: number;       // Deprecated: Use salePrice instead
}

interface Invoice {
  id: string;
  serverId?: string;
  _id?: string;
  number?: string;
  invoiceNumber?: string;
  clientInfo?: ClientInfo;
  clientName?: string;
  clientPhone?: string;
  clientCustomerId?: string;
  clientAddress?: string;
  clientEmailId?: string;
  clientGstNo?: string;
  items: InvoiceItem[];
  subtotal?: number;
  subTotal?: number;
  tax?: number;
  totalTax?: number;
  discount?: number;
  totalDiscount?: number;
  total?: number;
  totalAmount?: number;
  grandTotal?: number;
  paidAmount?: number;
  remainingAmount?: number;
  pendingAmount?: number;
  status?: string;
  notes?: string;
  createdAt?: string;
  invoiceDate?: string;
  dueDate?: string;
  synced?: boolean;
  statusUpdatedAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientName?: string;
  clientPhone?: string;
  amount: number;
  paymentMethod?: string;
  method?: string;
  notes?: string;
  note?: string;
  recordedAt?: string;
  date?: string;
  time?: string;
  paidAt?: string;
  createdAt?: string;
  paymentType?: string;
  isOffline?: boolean;
}

export interface ItemGroup {
  id: string;
  serverId?: string;
  _id?: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface Draft {
  id: string;
  savedAt?: string;
  [key: string]: any;
}

interface Product {
  productId: string;
  quantity: number;
  costPerUnit?: number;
  itemName?: string;
}

interface ShopDetails {
  shopName?: string;
  location?: string;
  city?: string;
  state?: string;
  ownerName?: string;
  phoneNumber?: string;
  invoiceCount?: number;
  profileImage?: string;
  gstin?: string;
}

export interface SaveResult<T> {
  success: boolean;
  error?: string;
  item?: T;
  items?: T[];
  client?: Client;
  clients?: Client[];
  invoice?: Invoice;
  invoices?: Invoice[];
  payment?: Payment;
  payments?: Payment[];
  draft?: Draft;
  drafts?: Draft[];
  group?: ItemGroup;
  synced?: boolean;
  offline?: boolean;
}

interface FetchAllDataResult {
  success: boolean;
  error?: string;
  data?: {
    items: Item[];
    clients: Client[];
    invoices: Invoice[];
    groups: ItemGroup[];
    profile: ShopDetails | null;
  };
}

interface PendingSyncByType {
  item: number;
  client: number;
  invoice: number;
  payment: number;
  total: number;
}

interface DashboardInsights {
  data: any;
  source: 'online' | 'cache';
}

// Get clientId from storage
// Get clientId from storage
let cachedClientId: string | null = null;
let isSyncing: boolean = false; // Sync lock to prevent race conditions

export const getClientId = async (): Promise<string | null> => {
  if (cachedClientId) return cachedClientId;

  try {
    const clientId = await AsyncStorage.getItem('@viveha_client_id');
    if (clientId) {
      cachedClientId = clientId;
      return clientId;
    }
    return null;
  } catch (error) {
    console.error('Error getting client ID:', error);
    return null;
  }
};

export const setClientId = async (clientId: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('@viveha_client_id', clientId);
    cachedClientId = clientId;
    return true;
  } catch (error) {
    console.error('Error setting client ID:', error);
    return false;
  }
};

// Get token from storage
export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('@viveha_token');
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Hook to monitor network status
export const useNetworkStatus = (): NetworkStatus => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isConnected || !isInternetReachable;
      const isNowOnline = state.isConnected && state.isInternetReachable;

      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);

      // When connection is restored, sync pending changes
      if (wasOffline && isNowOnline) {
        console.log('🌐 Connection restored! Syncing pending changes...');
        syncWithServer().then((result: SyncResult) => {
          if (result.success) {
            console.log(`✅ Synced ${result.synced} items to backend`);
          } else {
            console.log('⚠️ Sync failed:', result.error);
          }
        }).catch((err: any) => {
          console.error('❌ Sync error:', err);
        });
      }
    });

    return () => unsubscribe();
  }, [isConnected, isInternetReachable]);

  return { isConnected, isInternetReachable };
};

// Storage keys
export const STORAGE_KEYS = {
  INVOICES: '@invoices',
  ITEMS: '@viveha_items',
  CLIENTS: '@viveha_clients',
  PENDING_SYNC: '@pending_sync',
  BUSINESS_INFO: '@business_info',
  PAYMENTS: '@viveha_payments',
  DRAFTS: '@viveha_drafts',
  LAST_SYNC: '@last_sync',
  SYNC_STATUS: '@sync_status',
  PENDING_INVOICES: '@viveha_pending_invoices',
  ITEM_GROUPS: '@viveha_item_groups',
  FETCHED_PAYMENTS: '@viveha_fetched_payments',
  DASHBOARD: '@viveha_dashboard',
};

// Save data locally
export const saveLocalData = async (key: string, data: any): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving local data:', error);
    return false;
  }
};

// Get local data
export const getLocalData = async (key: string): Promise<any> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting local data:', error);
    return null;
  }
};

// Add to pending sync queue
export const addToPendingSync = async (action: 'create' | 'update' | 'delete', type: 'invoice' | 'item' | 'client' | 'payment' | 'group' | 'invoice_status', data: any): Promise<boolean> => {
  try {
    const pendingSync: PendingSyncItem[] = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const newItem: PendingSyncItem = {
      id: Date.now().toString(),
      action, // 'create', 'update', 'delete'
      type, // 'invoice', 'item', 'client', 'payment'
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    pendingSync.push(newItem);
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, pendingSync);
    return true;
  } catch (error) {
    console.error('Error adding to pending sync:', error);
    return false;
  }
};

// Get pending sync items
export const getPendingSyncItems = async (): Promise<PendingSyncItem[]> => {
  try {
    return await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
  } catch (error) {
    console.error('Error getting pending sync:', error);
    return [];
  }
};

// Remove specific item from pending sync
export const removeFromPendingSync = async (id: string): Promise<boolean> => {
  try {
    const pendingSync: PendingSyncItem[] = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const updatedSync = pendingSync.filter((item: PendingSyncItem) => item.id !== id);
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, updatedSync);
    return true;
  } catch (error) {
    console.error('Error removing from pending sync:', error);
    return false;
  }
};

// Clear pending sync after successful sync (Deprecated for bulk clear, but kept for reset)
export const clearPendingSync = async (): Promise<boolean> => {
  try {
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, []);
    await saveLocalData(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Error clearing pending sync:', error);
    return false;
  }
};

// ===== API CALLS =====

// Sync items with backend
const syncItemsToBackend = async (clientId: string, items: PendingSyncItem[]): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing items');
      return false;
    }

    const promises = items.map(async (pendingItem: PendingSyncItem) => {
      const item = pendingItem.data;
      const action = pendingItem.action;

      const payload = {
        clientId,
        name: item.name,
        actualPrice: item.actualPrice || item.amount || item.price || 0,
        salePrice: item.salePrice || item.price || item.amount || 0,
        price: item.salePrice || item.price || item.amount || 0, // Backend compatibility
        stock: item.stock || 0,
        unit: item.unit || 'nos',
        groupId: item.groupId || null,
        description: item.description || '',
      };

      if (action === 'delete') {
        const response = await fetch(`${apiurl}/business/items/${clientId}/${item.serverId || item.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await response.json();
        // Always remove delete actions from pending once attempted, or if success
        await removeFromPendingSync(pendingItem.id);
        return resData;
      } else if (item.serverId) {
        const response = await fetch(`${apiurl}/business/items/${clientId}/${item.serverId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();
        if (resData.success) await removeFromPendingSync(pendingItem.id);
        return resData;
      } else {
        const response = await fetch(`${apiurl}/business/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();

        // If created, we should really update the local item with serverId
        if (resData.success && resData.item) {
          const localItems: Item[] = await getLocalData(STORAGE_KEYS.ITEMS) || [];
          const updatedItems = localItems.map((i: Item) => i.id === item.id ? { ...i, serverId: resData.item._id } : i);
          await saveLocalData(STORAGE_KEYS.ITEMS, updatedItems);
          await removeFromPendingSync(pendingItem.id);
          console.log(`✅ Item "${item.name}" synced successfully`);
        }
        return resData;
      }
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error syncing items:', error);
    return false;
  }
};

// Sync clients with backend
const syncClientsToBackend = async (clientId: string, clients: PendingSyncItem[]): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing clients');
      return false;
    }

    const promises = clients.map(async (pendingClient: PendingSyncItem) => {
      const client = pendingClient.data;
      const action = pendingClient.action;

      const payload = {
        clientId,
        name: client.name,
        phone: client.phone,
      };

      if (action === 'delete') {
        const response = await fetch(`${apiurl}/business/client-customers/${clientId}/${client.serverId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await response.json();
        await removeFromPendingSync(pendingClient.id);
        return resData;
      } else if (client.serverId) {
        const response = await fetch(`${apiurl}/business/client-customers/${clientId}/${client.serverId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();
        if (resData.success) await removeFromPendingSync(pendingClient.id);
        return resData;
      } else {
        const response = await fetch(`${apiurl}/business/client-customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();

        if (resData.success && resData.clientCustomer) {
          const localClients: Client[] = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
          const updatedClients = localClients.map((c: Client) => c.id === client.id ? { ...c, serverId: resData.clientCustomer._id } : c);
          await saveLocalData(STORAGE_KEYS.CLIENTS, updatedClients);
          await removeFromPendingSync(pendingClient.id);
          console.log(`✅ Client "${client.name}" synced successfully`);
        }
        return resData;
      }
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error syncing clients:', error);
    return false;
  }
};

// Sync invoices with backend
const syncInvoicesToBackend = async (clientId: string, invoices: PendingSyncItem[]): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing invoices');
      return false;
    }

    // invoices is an array of pending wrapper objects: { id, data, ... }
    const promises = invoices.map(async (pendingItem: PendingSyncItem) => {
      try {
        const invoice = pendingItem.data; // Extract actual invoice data

        // CRITICAL: Check if invoice has items without VALID serverIds (offline items often have timestamp IDs)
        const itemsWithoutServerIds = (invoice.items || []).filter((item: InvoiceItem) =>
          !item.serverId || (typeof item.serverId === 'string' && item.serverId.length !== 24)
        );

        if (itemsWithoutServerIds.length > 0) {
          console.log(`⚠️ Invoice has ${itemsWithoutServerIds.length} items without serverIds, need to sync items first`);

          // Try to get updated items from local storage (they might have been synced)
          const localItems: Item[] = await getLocalData(STORAGE_KEYS.ITEMS) || [];

          // Update invoice items with serverIds if available
          const updatedInvoiceItems = (invoice.items || []).map((invoiceItem: InvoiceItem) => {
            if (!invoiceItem.serverId || invoiceItem.serverId.length !== 24) {
              // Try multiple matching strategies:
              // 1. Match by serverId (invoice item's serverId might be the old item's local id)
              // 2. Match by item id
              // 3. Match by name as fallback
              const syncedItem = localItems.find((li: Item) =>
                li.id === invoiceItem.serverId || // Invoice item serverId is old item's local id
                li.id === invoiceItem.id || // Direct id match
                (li.serverId && li.serverId === invoiceItem.serverId) || // Both have same serverId
                (li.name === invoiceItem.name && li.price === invoiceItem.price) // Fallback to name+price match
              );
              if (syncedItem && syncedItem.serverId) {
                console.log(`✅ Found serverId for item "${invoiceItem.name}": ${syncedItem.serverId} (matched from local id: ${syncedItem.id})`);
                return { ...invoiceItem, serverId: syncedItem.serverId };
              }
            }
            return invoiceItem;
          });

          // Check if we still have items without serverIds
          const stillMissingServerIds = updatedInvoiceItems.filter((item: InvoiceItem) => !item.serverId);
          if (stillMissingServerIds.length > 0) {
            console.log(`❌ Cannot sync invoice: ${stillMissingServerIds.length} items still missing serverIds`);
            console.log('Missing items:', stillMissingServerIds.map((i: InvoiceItem) => i.name).join(', '));
            return { success: false, error: 'Items not synced yet' };
          }

          // Update invoice with items that now have serverIds
          invoice.items = updatedInvoiceItems;
        }

        // Format products array for backend
        const products: Product[] = (invoice.items || []).map((item: InvoiceItem) => ({
          productId: item.serverId || item.id || '',
          quantity: item.quantity || 1,
        }));

        // Validate all products have valid serverIds (24-char MongoDB ObjectIds)
        const invalidProducts = products.filter((p: Product) => !p.productId || typeof p.productId !== 'string' || p.productId.length !== 24);
        if (invalidProducts.length > 0) {
          const invalidProductNames = invoice.items
            .filter((item: InvoiceItem, idx: number) => invalidProducts.some((ip: Product) => products[idx]?.productId === ip.productId))
            .map((item: InvoiceItem) => item.name)
            .join(', ');
          console.log(`❌ Cannot sync invoice: ${invalidProducts.length} items have invalid productIds`);
          console.log(`   Invalid items: ${invalidProductNames}`);
          console.log(`   ProductIds:`, invalidProducts.map((p: Product) => p.productId));
          return { success: false, error: 'Items not yet synced to backend' };
        }

        // Use the direct products route
        const invoicePayload = {
          clientId,
          clientCustomerName: invoice.clientInfo?.name || invoice.clientName || '',
          clientCustomerPhone: invoice.clientInfo?.phone || invoice.clientPhone || '',
          clientCustomerAddress: invoice.clientInfo?.address || invoice.clientAddress || '',
          clientCustomerEmailId: invoice.clientInfo?.email || invoice.clientInfo?.emailId || invoice.clientEmailId || '',
          clientCustomerGstNo: invoice.clientInfo?.gstNo || invoice.clientGstNo || '',
          invoiceNumber: invoice.number || invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subTotal || invoice.subtotal || 0,
          totalTax: invoice.tax || invoice.totalTax || 0,
          totalDiscount: invoice.discount || invoice.totalDiscount || 0,
          totalAmount: invoice.total || invoice.totalAmount || invoice.grandTotal || 0,
          paidAmount: invoice.paidAmount || 0,
          products: products,
          notes: invoice.notes || ''
        };

        const response = await fetch(`${apiurl}/business/invoices/generatewithproducts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoicePayload)
        });

        const data = await response.json();

        // CRITICAL: If successful, update local invoice with backend ID
        if (data.success && data.invoice && data.invoice._id) {
          const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
          const updatedInvoices = localInvoices.map((inv: Invoice) => {
            if (inv.id === invoice.id) {
              return {
                ...inv,
                serverId: data.invoice._id,
                _id: data.invoice._id
              };
            }
            return inv;
          });
          await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);
          console.log(`✅ Invoice synced and updated with backend ID: ${data.invoice._id}`);

          // CRITICAL: Remove from pending sync immediately using the wrapper ID
          await removeFromPendingSync(pendingItem.id);
        }

        return data;
      } catch (error: any) {
        console.log('Failed to sync invoice (expected when offline):', error.message);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every((r: any) => r.success);
    return allSuccess;
  } catch (error: any) {
    console.log('Failed to sync invoices (expected when offline):', error.message);
    return false;
  }
};

// Sync groups to backend
const syncGroupsToBackend = async (clientId: string, groups: PendingSyncItem[]): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) return false;

    const promises = groups.map(async (pendingGroup: PendingSyncItem) => {
      const group = pendingGroup.data;
      const action = pendingGroup.action;

      const payload = {
        clientId,
        name: group.name,
        description: group.description || '',
      };

      try {
        if (action === 'delete') {
          // If it was a local-only group (no server ID), just remove from queue
          if (group.id && group.id.includes('-')) { // Assuming local IDs might have dashes or be timestamps? Actually check length
            // If ID is not 24 chars, it's likely local. But wait, if we delete a local group, we just delete it locally. 
            // If we are here, it means we want to delete from backend OR it was a tracked deletion.
            // If serverId is present, use it.
          }

          const idToDelete = group.serverId || (group.id.length === 24 ? group.id : null);

          if (idToDelete) {
            const response = await fetch(`${apiurl}/business/item-groups/${clientId}/${idToDelete}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            // We consider it done even if it 404s
          }
          await removeFromPendingSync(pendingGroup.id);
          return { success: true };

        } else if (group.serverId && group.serverId.length === 24) {
          // Update existing
          const response = await fetch(`${apiurl}/business/item-groups/${clientId}/${group.serverId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
          const resData = await response.json();
          if (resData.success) await removeFromPendingSync(pendingGroup.id);
          return resData;

        } else {
          // Create new
          const response = await fetch(`${apiurl}/business/item-groups`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
          const resData = await response.json();

          if (resData.success && resData.itemGroup) {
            // Update local group with server ID
            const localGroups: ItemGroup[] = await getLocalData(STORAGE_KEYS.ITEM_GROUPS) || [];
            const updatedGroups = localGroups.map((g: ItemGroup) => g.id === group.id ? {
              ...g,
              serverId: resData.itemGroup._id,
              _id: resData.itemGroup._id
            } : g);
            await saveLocalData(STORAGE_KEYS.ITEM_GROUPS, updatedGroups);
            await removeFromPendingSync(pendingGroup.id);
          }
          return resData;
        }
      } catch (err: any) {
        console.error('Error syncing individual group:', err);
        return { success: false, error: err.message };
      }
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error syncing groups:', error);
    return false;
  }
};

// Sync payments to backend
const syncPaymentsToBackend = async (clientId: string, paymentItems: PendingSyncItem[]): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing payments');
      return false;
    }

    console.log(`💰 Syncing ${paymentItems.length} payments...`);

    const promises = paymentItems.map(async (paymentItem: PendingSyncItem) => {
      try {
        const payment = paymentItem.data;

        // Get the invoice from local storage to find backend ID
        const invoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
        const invoice = invoices.find((inv: Invoice) =>
          inv.id === payment.invoiceId ||
          inv.serverId === payment.invoiceId ||
          inv._id === payment.invoiceId
        );

        // CRITICAL: Must have a valid backend ObjectId (24 char hex string)
        const backendInvoiceId = invoice?.serverId || invoice?._id;

        if (!backendInvoiceId || typeof backendInvoiceId !== 'string' || backendInvoiceId.length !== 24) {
          console.error('❌ No valid backend invoice ID for payment. Local ID:', payment.invoiceId, 'Found serverId:', backendInvoiceId);
          console.log('⚠️ Invoice needs to be synced to backend first. Skipping payment sync.');
          return { success: false, error: 'Invoice not synced to backend yet' };
        }

        console.log(`💳 Syncing payment: Rs.${payment.amount} for invoice ${backendInvoiceId}`);

        const response = await fetch(`${apiurl}/business/invoices/pay`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
            invoiceId: backendInvoiceId,
            amount: payment.amount,
            method: payment.paymentMethod || 'cash',
            note: payment.notes || payment.note || '',
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log(`✅ Payment synced successfully`);
          // CRITICAL: Remove from pending sync immediately to prevent duplicates on retry
          await removeFromPendingSync(paymentItem.id);
          return { success: true };
        } else {
          console.error(`❌ Payment sync failed:`, data.message);
          return { success: false, error: data.message };
        }
      } catch (error: any) {
        console.error('❌ Error syncing payment:', error);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every((r: any) => r.success);

    if (allSuccess) {
      console.log('✅ All payments synced successfully');
    } else {
      console.log('⚠️ Some payments failed to sync');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ Error syncing payments:', error);
    return false;
  }
};

// Sync with server
export const syncWithServer = async (): Promise<SyncResult> => {
  // Prevent multiple concurrent syncs
  if (isSyncing) {
    console.log('⚠️ Sync already in progress, skipping concurrent duplicate call');
    return { success: false, error: 'Sync in progress' };
  }

  isSyncing = true;

  try {
    const clientId = await getClientId();
    if (!clientId) {
      console.log('No client ID found, skipping sync');
      return { success: false, error: 'No client ID' };
    }

    const pendingItems = await getPendingSyncItems();

    if (pendingItems.length === 0) {
      return { success: true, synced: 0 };
    }

    // Group by type
    const itemsToSync = pendingItems.filter((p: PendingSyncItem) => p.type === 'item');
    const clientsToSync = pendingItems.filter((p: PendingSyncItem) => p.type === 'client');
    const invoicesToSync = pendingItems.filter((p: PendingSyncItem) => p.type === 'invoice');
    const paymentsToSync = pendingItems.filter((p: PendingSyncItem) => p.type === 'payment');
    const groupsToSync = pendingItems.filter((p: PendingSyncItem) => p.type === 'group');

    console.log(`🔄 Syncing: ${itemsToSync.length} items, ${clientsToSync.length} clients, ${invoicesToSync.length} invoices, ${paymentsToSync.length} payments, ${groupsToSync.length} groups`);

    // Sync each type
    let syncSuccess = true;

    if (itemsToSync.length > 0) {
      console.log(`📦 Syncing ${itemsToSync.length} items to backend...`);
      const success = await syncItemsToBackend(clientId, itemsToSync);
      if (!success) {
        console.log('⚠️ Items sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Items synced successfully`);
      }
    }

    if (clientsToSync.length > 0) {
      console.log(`👥 Syncing ${clientsToSync.length} clients to backend...`);
      const success = await syncClientsToBackend(clientId, clientsToSync);
      if (!success) {
        console.log('⚠️ Clients sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Clients synced successfully`);
      }
    }

    if (invoicesToSync.length > 0) {
      console.log(`🧾 Syncing ${invoicesToSync.length} invoices to backend...`);
      const success = await syncInvoicesToBackend(clientId, invoicesToSync);
      if (!success) {
        console.log('⚠️ Invoices sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Invoices synced successfully`);
      }
    }

    // CRITICAL: Sync payments to backend
    if (paymentsToSync.length > 0) {
      console.log(`💰 Syncing ${paymentsToSync.length} offline payments to backend...`);
      const success = await syncPaymentsToBackend(clientId, paymentsToSync);
      if (!success) {
        console.log('⚠️ Payments sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Payments synced successfully`);
      }
    }

    if (groupsToSync.length > 0) {
      console.log(`📁 Syncing ${groupsToSync.length} groups to backend...`);
      const success = await syncGroupsToBackend(clientId, groupsToSync);
      if (!success) {
        console.log('⚠️ Groups sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Groups synced successfully`);
      }
    }

    if (syncSuccess) {
      // Update last sync time but DO NOT clear pending sync (handled individually now)
      await saveLocalData(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      console.log('✅ All sync operations completed successfully');
    } else {
      console.log('⚠️ Some sync operations had issues');
    }

    return { success: syncSuccess, synced: pendingItems.length };
  } catch (error: any) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
};

// Get last sync time
export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    return await getLocalData(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

// ===== ITEM MANAGEMENT =====

// Fetch items from backend
export const fetchItemsFromBackend = async (): Promise<Item[]> => {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      console.log('No clientId found');
      return [];
    }

    const token = await AsyncStorage.getItem('@viveha_token');
    if (!token) {
      console.log('No auth token found');
      return [];
    }

    const response = await fetch(`${apiurl}/business/items/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    console.log('Fetched items from backend:', data);

    if (data.success && data.items) {
      // Map backend items to frontend format
      const items: Item[] = data.items.map((item: any) => {
        // If backend has both prices, use them
        // Otherwise, treat backend price as salePrice and use it for actualPrice too (until backend is updated)
        const hasActualPrice = item.actualPrice !== undefined && item.actualPrice !== null;
        const hasSalePrice = item.salePrice !== undefined && item.salePrice !== null;

        let actualPrice: number;
        let salePrice: number;

        if (hasActualPrice && hasSalePrice) {
          // Backend has both prices
          actualPrice = item.actualPrice;
          salePrice = item.salePrice;
        } else if (hasActualPrice) {
          // Only has actualPrice
          actualPrice = item.actualPrice;
          salePrice = item.price || item.actualPrice;
        } else if (hasSalePrice) {
          // Only has salePrice
          actualPrice = item.price || item.salePrice;
          salePrice = item.salePrice;
        } else {
          // Backend only has generic price - use it for both until backend supports dual pricing
          actualPrice = item.price || 0;
          salePrice = item.price || 0;
        }

        return {
          id: item._id,
          serverId: item._id,
          name: item.name,
          actualPrice: actualPrice,
          salePrice: salePrice,
          amount: actualPrice, // Backward compatibility - use actualPrice
          price: salePrice,    // Backward compatibility - use salePrice
          stock: item.stock,
          unit: item.unit,
          groupId: item.groupId,
          groupName: item.groupName || '',
          description: item.description || '',
          createdAt: item.createdAt,
        };
      });

      // Save to local storage
      await saveLocalData(STORAGE_KEYS.ITEMS, items);
      console.log('Items saved to local storage:', items.length);
      return items;
    }

    return [];
  } catch (error) {
    console.error('Error fetching items from backend:', error);
    return [];
  }
};

// Create or update item with offline support
export const saveItem = async (item: Item, isUpdate: boolean = false): Promise<SaveResult<Item>> => {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      throw new Error('Client ID not found. Please login again.');
    }

    // Get auth token
    const token = await AsyncStorage.getItem('@viveha_token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const items: Item[] = await getLocalData(STORAGE_KEYS.ITEMS) || [];

    // Try to sync with backend immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      try {
        const payload = {
          clientId,
          name: item.name,
          actualPrice: item.actualPrice || item.amount || item.price || 0,
          salePrice: item.salePrice || item.price || item.amount || 0,
          price: item.salePrice || item.price || item.amount || 0, // Backend compatibility
          stock: item.stock || 0,
          unit: item.unit || 'nos',
          description: item.description || '',
          // Note: groupId is local-only, not sent to backend
        };

        let response;
        if (isUpdate && item.serverId) {
          response = await fetch(`${apiurl}/business/items/${clientId}/${item.serverId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
        } else {
          response = await fetch(`${apiurl}/business/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
        }

        const data = await response.json();
        console.log('Backend response:', data);

        if (data.success && data.item) {
          // Update with server data, but preserve local dual pricing if backend doesn't support it yet
          const hasActualPrice = data.item.actualPrice !== undefined && data.item.actualPrice !== null;
          const hasSalePrice = data.item.salePrice !== undefined && data.item.salePrice !== null;

          let actualPrice: number;
          let salePrice: number;

          if (hasActualPrice && hasSalePrice) {
            // Backend supports dual pricing
            actualPrice = data.item.actualPrice;
            salePrice = data.item.salePrice;
          } else {
            // Backend doesn't support dual pricing yet, preserve our local values
            actualPrice = item.actualPrice;
            salePrice = item.salePrice;
          }

          const savedItem: Item = {
            id: item.id,
            serverId: data.item._id,
            name: data.item.name,
            actualPrice: actualPrice,
            salePrice: salePrice,
            amount: actualPrice, // Backward compatibility - use actualPrice
            price: salePrice,    // Backward compatibility - use salePrice
            stock: data.item.stock,
            unit: data.item.unit,
            groupId: data.item.groupId,
            groupName: data.item.groupName || '',
            description: data.item.description || '',
            createdAt: data.item.createdAt,
          };

          let updatedItems: Item[];
          if (isUpdate) {
            updatedItems = items.map((i: Item) => (i.id === item.id || i.serverId === savedItem.serverId) ? savedItem : i);
          } else {
            updatedItems = [...items, savedItem];
          }

          await saveLocalData(STORAGE_KEYS.ITEMS, updatedItems);
          console.log('Item saved successfully to backend and local storage');
          return { success: true, item: savedItem, items: updatedItems };
        } else {
          throw new Error(data.message || 'Failed to save to backend');
        }
      } catch (error) {
        console.error('Backend save failed:', error);
        // Fallback to offline save
      }
    }

    // If offline or sync failed, save locally and add to pending sync
    let updatedItems: Item[];
    if (isUpdate) {
      updatedItems = items.map((i: Item) => (i.id === item.id || (item.serverId && i.serverId === item.serverId)) ? item : i);
    } else {
      item.id = item.id || Date.now().toString();
      item.createdAt = new Date().toISOString();
      updatedItems = [...items, item];
    }

    await saveLocalData(STORAGE_KEYS.ITEMS, updatedItems);
    await addToPendingSync(isUpdate ? 'update' : 'create', 'item', item);
    console.log('Item saved locally, will sync later');

    return { success: true, item, items: updatedItems };
  } catch (error: any) {
    console.error('Error saving item:', error);
    return { success: false, error: error.message };
  }
};

// Delete item with offline support
export const deleteItem = async (itemId: string): Promise<SaveResult<Item>> => {
  try {
    const items: Item[] = await getLocalData(STORAGE_KEYS.ITEMS) || [];
    const itemToDelete = items.find((i: Item) => i.id === itemId);
    const updatedItems = items.filter((i: Item) => i.id !== itemId);

    // Optimistic local update
    await saveLocalData(STORAGE_KEYS.ITEMS, updatedItems);

    // Try to delete from backend immediately if online
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected && netInfo.isInternetReachable;
    const clientId = await getClientId();
    const token = await getToken();

    // Determine ID to use for server (use serverId if available, else id if it looks like a MongoID)
    const serverId = itemToDelete?.serverId || (itemId.length === 24 ? itemId : null);

    if (isOnline && clientId && token && serverId) {
      try {
        const response = await fetch(`${apiurl}/business/items/${clientId}/${serverId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Item deleted from backend successfully');
          return { success: true, items: updatedItems, synced: true };
        } else {
          console.warn('⚠️ Backend delete failed, queuing for sync:', data.message);
          // Fallback to sync queue
          await addToPendingSync('delete', 'item', { id: itemId, ...itemToDelete });
          return { success: true, items: updatedItems, synced: false };
        }
      } catch (backendError) {
        console.error('Error calling backend delete:', backendError);
        await addToPendingSync('delete', 'item', { id: itemId, ...itemToDelete });
        return { success: true, items: updatedItems, synced: false };
      }
    } else {
      // Offline or local-only item - queue for sync
      await addToPendingSync('delete', 'item', { id: itemId, ...itemToDelete });
      return { success: true, items: updatedItems, synced: false };
    }
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
};

// Get all items
export const getItems = async (): Promise<Item[]> => {
  try {
    // First try to get from local storage
    const localItems: Item[] = await getLocalData(STORAGE_KEYS.ITEMS) || [];

    // Try to fetch from backend if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      const backendItems = await fetchItemsFromBackend();
      if (backendItems.length >= 0) {
        // Merge backend items with local items to preserve dual pricing
        // if backend doesn't support it yet
        const mergedItems = backendItems.map(backendItem => {
          const localItem = localItems.find(li =>
            li.serverId === backendItem.serverId || li.id === backendItem.id
          );

          // If local item exists and has different prices but backend doesn't,
          // preserve the local pricing
          if (localItem &&
            localItem.actualPrice !== localItem.salePrice &&
            backendItem.actualPrice === backendItem.salePrice) {
            return {
              ...backendItem,
              actualPrice: localItem.actualPrice,
              salePrice: localItem.salePrice,
              amount: localItem.actualPrice,
              price: localItem.salePrice,
            };
          }

          return backendItem;
        });

        // Save merged data to local storage
        await saveLocalData(STORAGE_KEYS.ITEMS, mergedItems);
        return mergedItems;
      }
    }

    return localItems;
  } catch (error) {
    console.error('Error getting items:', error);
    return [];
  }
};

// Save or update a client
export const saveClient = async (client: Client, isUpdate: boolean = false): Promise<SaveResult<Client>> => {
  try {
    const clientId = await getClientId();
    const clients: Client[] = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
    let updatedClients: Client[];

    if (isUpdate) {
      updatedClients = clients.map((c: Client) => c.id === client.id ? client : c);
    } else {
      client.id = client.id || Date.now().toString();
      client.createdAt = new Date().toISOString();
      updatedClients = [...clients, client];
    }

    await saveLocalData(STORAGE_KEYS.CLIENTS, updatedClients);

    // Try to sync with backend immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable && clientId) {
      try {
        const token = await getToken();
        if (!token) {
          console.log('No token found for saving client');
          await addToPendingSync(isUpdate ? 'update' : 'create', 'client', client);
          return { success: true, client, clients: updatedClients, synced: false };
        }

        const payload = {
          clientId,
          name: client.name,
          phone: client.phone,
        };

        let response;
        if (isUpdate && client.serverId) {
          response = await fetch(`${apiurl}/business/client-customers/${clientId}/${client.serverId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        } else {
          response = await fetch(`${apiurl}/business/client-customers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }

        const data = await response.json();
        if (data.success && data.clientCustomer) {
          // Update with server ID
          client.serverId = data.clientCustomer._id;
          const finalClients = updatedClients.map((c: Client) => c.id === client.id ? client : c);
          await saveLocalData(STORAGE_KEYS.CLIENTS, finalClients);
          return { success: true, client, clients: finalClients, synced: true };
        }
      } catch (error: any) {
        console.log('Saving to pending sync:', error.message);
      }
    }

    // If offline or sync failed, add to pending sync
    await addToPendingSync(isUpdate ? 'update' : 'create', 'client', client);

    return { success: true, client, clients: updatedClients, synced: false };
  } catch (error: any) {
    console.error('Error saving client:', error);
    return { success: false, error: error.message };
  }
};

// Get all clients
export const getClients = async (): Promise<Client[]> => {
  try {
    // First try to get from local storage
    const localClients: Client[] = await getLocalData(STORAGE_KEYS.CLIENTS) || [];

    // Try to fetch from backend if online
    const netInfo2 = await NetInfo.fetch();
    if (netInfo2.isConnected && netInfo2.isInternetReachable) {
      const backendClients = await fetchClientsFromBackend();
      if (backendClients.length >= 0) { // Always trust backend data
        return backendClients;
      }
    }

    return localClients;
  } catch (error) {
    console.error('Error getting clients:', error);
    return [];
  }
};

// Save or update an invoice
export const saveInvoice = async (invoice: Invoice, isUpdate: boolean = false): Promise<SaveResult<Invoice>> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    // DIRECT AsyncStorage read to be 100% sure
    const rawData = await AsyncStorage.getItem('@invoices');
    const invoices: Invoice[] = rawData ? JSON.parse(rawData) : [];

    console.log(`💾 saveInvoice - Found ${invoices.length} existing invoices in storage (direct read)`);
    if (invoices.length > 0) {
      console.log(`   First 3 invoice numbers: ${invoices.slice(0, 3).map((i: Invoice) => i.number || i.invoiceNumber).join(', ')}`);
    }
    let updatedInvoices: Invoice[];

    if (isUpdate) {
      updatedInvoices = invoices.map((inv: Invoice) => inv.id === invoice.id ? invoice : inv);
    } else {
      invoice.id = invoice.id || Date.now().toString();
      invoice.createdAt = invoice.createdAt || new Date().toISOString();
      invoice.status = invoice.status || 'pending';
      updatedInvoices = [...invoices, invoice];
    }

    console.log(`💾 saveInvoice - Saving ${updatedInvoices.length} total invoices (${isUpdate ? 'updated' : 'added new'} invoice #${invoice.number || invoice.invoiceNumber})`);

    // DIRECT AsyncStorage write
    await AsyncStorage.setItem('@invoices', JSON.stringify(updatedInvoices));

    // CRITICAL DEBUG: Save count to separate key to verify storage is working
    await AsyncStorage.setItem('@debug_invoice_count', updatedInvoices.length.toString());

    // Verify it was saved with DIRECT read
    const verifyRaw = await AsyncStorage.getItem('@invoices');
    const verifyInvoices: Invoice[] = verifyRaw ? JSON.parse(verifyRaw) : [];
    const debugCount = await AsyncStorage.getItem('@debug_invoice_count');
    console.log(`✅ Verified: ${verifyInvoices.length} invoices now in storage (debug count: ${debugCount})`);

    // Try to sync with backend immediately if online
    const netInfo3 = await NetInfo.fetch();
    if (netInfo3.isConnected && netInfo3.isInternetReachable && clientId && token) {
      try {
        // Format products array for backend
        const products: Product[] = invoice.items.map((item: InvoiceItem) => ({
          productId: item.serverId || item.id || '',
          quantity: item.quantity || 1,
        }));

        // Use the direct products route
        const invoicePayload = {
          clientId,
          clientCustomerName: invoice.clientInfo?.name || invoice.clientName || '',
          clientCustomerPhone: invoice.clientInfo?.phone || invoice.clientPhone || '',
          clientCustomerAddress: invoice.clientInfo?.address || invoice.clientAddress || '',
          clientCustomerEmailId: invoice.clientInfo?.email || invoice.clientInfo?.emailId || invoice.clientEmailId || '',
          clientCustomerGstNo: invoice.clientInfo?.gstNo || invoice.clientGstNo || '',
          invoiceNumber: invoice.number || invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subTotal || invoice.subtotal || 0,
          totalTax: invoice.tax || invoice.totalTax || 0,
          totalDiscount: invoice.discount || invoice.totalDiscount || 0,
          totalAmount: invoice.total || invoice.totalAmount || invoice.grandTotal || 0,
          paidAmount: invoice.paidAmount || 0,
          products: products,
          notes: invoice.notes || ''
        };

        const response = await fetch(`${apiurl}/business/invoices/generatewithproducts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoicePayload)
        });

        const data = await response.json();

        if (data.success && data.invoice) {
          console.log('Invoice synced to backend successfully');
          // Update with server ID
          invoice.serverId = data.invoice._id;
          invoice.synced = true;
          const finalInvoices = updatedInvoices.map((inv: Invoice) => inv.id === invoice.id ? invoice : inv);
          await saveLocalData(STORAGE_KEYS.INVOICES, finalInvoices);
          return { success: true, invoice, invoices: finalInvoices, synced: true };
        } else {
          console.warn('Backend invoice creation failed:', data.message);
          throw new Error(data.message || 'Failed to sync');
        }
      } catch (error: any) {
        console.log('Failed to sync invoice to backend:', error.message);
        console.log('Adding to pending sync queue');
        await addToPendingSync(isUpdate ? 'update' : 'create', 'invoice', invoice);
      }
    } else {
      console.log('Offline - adding invoice to pending sync');
      await addToPendingSync(isUpdate ? 'update' : 'create', 'invoice', invoice);
    }

    return { success: true, invoice, invoices: updatedInvoices, synced: false };
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    return { success: false, error: error.message };
  }
};

// Fetch clients from backend
export const fetchClientsFromBackend = async (): Promise<Client[]> => {
  try {
    const clientId = await getClientId();
    if (!clientId) return [];

    const token = await getToken();
    if (!token) {
      console.log('No token found for fetching clients');
      return [];
    }

    const response = await fetch(`${apiurl}/business/client-customers/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (data.success && data.clientCustomers) {
      // Map backend clients to frontend format
      const clients: Client[] = data.clientCustomers.map((client: any) => ({
        id: client._id,
        serverId: client._id,
        name: client.name,
        phone: client.phoneNumber, // Backend uses 'phoneNumber' field
        createdAt: client.createdAt,
      }));

      // Save to local storage
      await saveLocalData(STORAGE_KEYS.CLIENTS, clients);
      return clients;
    }

    return [];
  } catch (error) {
    console.error('Error fetching clients from backend:', error);
    return [];
  }
};

// Delete client with offline support
export const deleteClient = async (clientId: string): Promise<SaveResult<Client>> => {
  try {
    const clients: Client[] = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
    const clientToDelete = clients.find((c: Client) => c.id === clientId);
    const updatedClients = clients.filter((c: Client) => c.id !== clientId);

    await saveLocalData(STORAGE_KEYS.CLIENTS, updatedClients);
    await addToPendingSync('delete', 'client', { id: clientId, ...clientToDelete });

    return { success: true, clients: updatedClients };
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
};

// Get customer profile with invoices and payments
export const getCustomerProfile = async (customerId: string): Promise<any> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${apiurl}/business/client-customers/${clientId}/${customerId}/profile`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to fetch customer profile');
    }
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
};

// ===== INVOICE MANAGEMENT =====

// Delete invoice with offline support
export const deleteInvoice = async (invoiceId: string): Promise<SaveResult<Invoice>> => {
  try {
    const invoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const invoiceToDelete = invoices.find((inv: Invoice) => inv.id === invoiceId);
    const updatedInvoices = invoices.filter((inv: Invoice) => inv.id !== invoiceId);

    await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);
    await addToPendingSync('delete', 'invoice', { id: invoiceId, ...invoiceToDelete });

    return { success: true, invoices: updatedInvoices };
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return { success: false, error: error.message };
  }
};

// Fetch invoices from backend with clientId isolation
export const fetchInvoicesFromBackend = async (): Promise<Invoice[] | null> => {
  try {
    const clientId = await getClientId();
    if (!clientId) return [];

    const response = await fetch(`${apiurl}/business/invoices/${clientId}`);
    const data = await response.json();

    if (data.success && data.invoices) {
      // Map backend invoices to frontend format and calculate status
      const invoices: Invoice[] = data.invoices.map((invoice: any) => {
        const totalAmount = invoice.totalAmount || 0;
        const paidAmount = invoice.paidAmount || 0;
        const remainingAmount = totalAmount - paidAmount;

        // Calculate status based on payment amount
        let status = 'pending';
        if (paidAmount >= totalAmount && totalAmount > 0) {
          status = 'paid';
        } else if (paidAmount > 0 && paidAmount < totalAmount) {
          status = 'partial';
        }

        return {
          id: invoice._id,
          serverId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientInfo: {
            name: invoice.clientCustomerName || '',
            phone: invoice.clientCustomerPhone || '',
            serverId: invoice.clientCustomerId
          },
          items: invoice.items || [],
          subtotal: invoice.subtotal || invoice.subTotal || 0,
          subTotal: invoice.subTotal || invoice.subtotal || 0,
          tax: invoice.totalTax || invoice.tax || 0,
          totalTax: invoice.totalTax || invoice.tax || 0,
          discount: invoice.totalDiscount || invoice.discount || 0,
          totalDiscount: invoice.totalDiscount || invoice.discount || 0,
          total: totalAmount,
          grandTotal: totalAmount,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          status: status,
          notes: invoice.notes || '',
          createdAt: invoice.createdAt,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          additionalFees: invoice.additionalFees || [],
          customCharges: invoice.customCharges || [],
        };
      });

      // CRITICAL: Merge with local invoices instead of replacing
      // Keep local-only invoices (ones without serverId that haven't synced yet)
      const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
      const localOnlyInvoices = localInvoices.filter((inv: Invoice) => !inv.serverId);

      console.log(`📥 Backend: ${invoices.length} invoices, Local-only: ${localOnlyInvoices.length} invoices`);

      // Merge: backend invoices + local-only invoices
      const mergedInvoices = [...invoices, ...localOnlyInvoices];

      await saveLocalData(STORAGE_KEYS.INVOICES, mergedInvoices);
      return mergedInvoices;
    }

    return null;
  } catch (error) {
    console.error('Error fetching invoices from backend:', error);
    return null;
  }
};

// Get all invoices (fetch from backend first, fallback to local)
export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    // First try to get from local storage
    const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];

    // Try to fetch from backend if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      const backendInvoices = await fetchInvoicesFromBackend();
      if (backendInvoices !== null) { // Only use backend data if fetch succeeded
        return backendInvoices;
      }
    }

    return localInvoices;
  } catch (error) {
    console.error('Error getting invoices:', error);
    return [];
  }
};

// Get pending invoices (where paidAmount < totalAmount) from backend with offline support
export const getPendingInvoices = async (): Promise<any[]> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    // Check network status
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

    console.log(`🌐 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // ALWAYS read from local INVOICES first (source of truth for offline changes)
    // DIRECT AsyncStorage read to be 100% sure
    const rawData = await AsyncStorage.getItem('@invoices');
    const localInvoices: Invoice[] = rawData ? JSON.parse(rawData) : [];
    const debugCount = await AsyncStorage.getItem('@debug_invoice_count');
    console.log(`📦 Found ${localInvoices.length} invoices in local storage (direct read, last saved count: ${debugCount})`);
    if (localInvoices.length > 0) {
      console.log(`   Invoice numbers: ${localInvoices.map((i: Invoice) => i.number || i.invoiceNumber).join(', ')}`);
      console.log(`   Invoice IDs: ${localInvoices.slice(0, 3).map((i: Invoice) => i.id).join(', ')}...`);
    } else {
      console.log('   ⚠️ WARNING: INVOICES storage is EMPTY but debug count says: ' + debugCount);
    }

    let backendPendings: any[] = [];

    // If online with token, try to fetch from backend
    if (isOnline && token && clientId) {
      try {
        // CRITICAL: Sync offline payments BEFORE fetching new data
        const pendingSync = await getPendingSyncItems();
        const pendingPayments = pendingSync.filter((p: PendingSyncItem) => p.type === 'payment');

        if (pendingPayments.length > 0) {
          console.log(`💰 Found ${pendingPayments.length} offline payments, syncing first...`);
          await syncWithServer();
          // Wait a bit for backend to process
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('🌐 Fetching pending invoices from backend...');
        const response = await fetch(`${apiurl}/business/pending-invoices/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success && data.pendingInvoices) {
          backendPendings = data.pendingInvoices;
          console.log(`✅ Fetched ${backendPendings.length} pending invoices from backend`);
          if (backendPendings.length > 0) {
            console.log('Sample backend invoice:', {
              _id: backendPendings[0]._id,
              invoiceNumber: backendPendings[0].invoiceNumber,
              clientCustomerId: backendPendings[0].clientCustomerId,
              clientCustomerName: backendPendings[0].clientCustomerName,
              clientCustomerPhone: backendPendings[0].clientCustomerPhone
            });
          }

          // CRITICAL: Save backend pendings to INVOICES storage so they can be updated when payments are recorded
          const invoicesToStore: Invoice[] = backendPendings.map((inv: any) => ({
            id: inv._id || inv.id,
            serverId: inv._id || inv.serverId,
            number: inv.invoiceNumber,
            invoiceNumber: inv.invoiceNumber,
            clientInfo: {
              name: inv.clientCustomerName || '',
              phone: inv.clientCustomerPhone || ''
            },
            clientName: inv.clientCustomerName || '',
            clientPhone: inv.clientCustomerPhone || '',
            clientCustomerId: inv.clientCustomerId,
            items: (inv.products || []).map((p: any) => ({
              name: p.itemName,
              itemName: p.itemName,
              quantity: p.quantity,
              price: p.costPerUnit
            })),
            total: inv.totalAmount,
            totalAmount: inv.totalAmount,
            grandTotal: inv.totalAmount,
            paidAmount: inv.paidAmount || 0,
            remainingAmount: inv.pendingAmount,
            status: inv.status || 'pending',
            createdAt: inv.createdAt,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            // Include financial breakdown
            subtotal: inv.subtotal || inv.subTotal || 0,
            subTotal: inv.subTotal || inv.subtotal || 0,
            tax: inv.totalTax || inv.tax || 0,
            totalTax: inv.totalTax || inv.tax || 0,
            discount: inv.totalDiscount || inv.discount || 0,
            totalDiscount: inv.totalDiscount || inv.discount || 0,
            additionalFees: inv.additionalFees || [],
            customCharges: inv.customCharges || [],
          }));

          // Save to INVOICES storage (merge with existing local invoices)
          const existingInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
          console.log(`🔍 BEFORE MERGE: ${existingInvoices.length} existing invoices in storage`);
          const invoiceMap = new Map<string, Invoice>();

          // Add existing LOCAL invoices WITHOUT serverId first (offline-only invoices)
          let localOnlyCount = 0;
          existingInvoices.forEach((inv: Invoice) => {
            if (!inv.serverId) {
              invoiceMap.set(inv.id, inv);
              localOnlyCount++;
              console.log(`   ➕ Keeping local-only invoice: ${inv.number || inv.invoiceNumber} (id: ${inv.id})`);
            }
          });

          // Add ALL backend invoices (they are source of truth for synced data)
          invoicesToStore.forEach((inv: Invoice) => {
            if (inv.serverId) {
              invoiceMap.set(inv.serverId, inv);
            }
          });

          const mergedInvoices = Array.from(invoiceMap.values());
          console.log(`💾 MERGE RESULT: ${localOnlyCount} local-only + ${invoicesToStore.length} backend = ${mergedInvoices.length} total invoices`);
          await saveLocalData(STORAGE_KEYS.INVOICES, mergedInvoices);

          // Also save to pending cache for backward compatibility
          await saveLocalData(STORAGE_KEYS.PENDING_INVOICES, backendPendings);
        }
      } catch (fetchError) {
        console.error('❌ Error fetching from backend:', fetchError);
      }
    } else {
      console.log('📴 Offline or no auth - using local data only');
    }

    // Process local invoices for pending ones (especially important for offline-created invoices)
    const localPendings = localInvoices
      .filter((inv: Invoice) => {
        const totalAmount = parseFloat(String(inv.total || inv.totalAmount || inv.grandTotal || 0));
        const paidAmount = parseFloat(String(inv.paidAmount || 0));
        const hasPending = totalAmount > 0 && paidAmount < totalAmount;
        if (!hasPending && totalAmount > 0) {
          console.log(`⚠️ Invoice ${inv.id} filtered out: total=${totalAmount}, paid=${paidAmount}`);
        }
        return hasPending;
      })
      .map((inv: Invoice) => ({
        _id: inv.serverId || inv.id,
        id: inv.id,
        serverId: inv.serverId,
        invoiceNumber: inv.number || inv.invoiceNumber,
        clientCustomerName: inv.clientInfo?.name || inv.clientName || '',
        clientCustomerPhone: inv.clientInfo?.phone || inv.clientPhone || '',
        clientCustomerId: inv.clientCustomerId,
        totalAmount: inv.total || inv.totalAmount || inv.grandTotal || 0,
        paidAmount: inv.paidAmount || 0,
        pendingAmount: (inv.total || inv.totalAmount || inv.grandTotal || 0) - (inv.paidAmount || 0),
        products: inv.items ? inv.items.map((item: InvoiceItem) => ({
          itemName: item.name,
          quantity: item.quantity,
          costPerUnit: item.price
        })) : [],
        createdAt: inv.createdAt,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        status: inv.status,
        // Include financial breakdown
        subtotal: (inv as any).subtotal || (inv as any).subTotal || 0,
        subTotal: (inv as any).subTotal || (inv as any).subtotal || 0,
        tax: (inv as any).tax || (inv as any).totalTax || 0,
        totalTax: (inv as any).totalTax || (inv as any).tax || 0,
        discount: (inv as any).discount || (inv as any).totalDiscount || 0,
        totalDiscount: (inv as any).totalDiscount || (inv as any).discount || 0,
        additionalFees: (inv as any).additionalFees || [],
        customCharges: (inv as any).customCharges || [],
      }));

    console.log(`📦 Local invoices: ${localInvoices.length}, Local pendings: ${localPendings.length}`);
    if (localPendings.length > 0) {
      console.log('Sample local pending:', {
        id: localPendings[0].id,
        invoiceNumber: localPendings[0].invoiceNumber,
        totalAmount: localPendings[0].totalAmount,
        paidAmount: localPendings[0].paidAmount,
        pendingAmount: localPendings[0].pendingAmount,
        clientCustomerId: localPendings[0].clientCustomerId,
        clientCustomerName: localPendings[0].clientCustomerName
      });
    }

    // CRITICAL: When OFFLINE, return ONLY local data - no merging with stale backend cache
    if (!isOnline) {
      console.log('📴 OFFLINE MODE - Returning local pending invoices only');
      // Filter to ensure only invoices with pending amounts
      const offlinePendings = localPendings.filter((inv: any) => {
        const pendingAmount = parseFloat(String(inv.pendingAmount || 0));
        return pendingAmount > 0.01;
      });
      console.log(`✅ Returning ${offlinePendings.length} offline pending invoices`);
      return offlinePendings;
    }

    // ONLINE MODE: Merge backend and local pendings
    console.log('🌐 ONLINE MODE - Merging local and backend data');
    const mergedPendings: any[] = [];
    const processedIds = new Set<string>();

    // CRITICAL: Always prioritize local pendings first (they have the latest offline payment updates)
    localPendings.forEach((localPending: any) => {
      const localId = localPending.serverId || localPending.id;
      const pendingAmount = parseFloat(String(localPending.pendingAmount || 0));

      // Only add if there's actually a pending amount
      if (pendingAmount > 0.01) {
        mergedPendings.push(localPending);
        processedIds.add(localId);
        processedIds.add(localPending.id); // Also add the local ID
      }
    });

    // Then add backend pendings that aren't already in local (and have pending amounts)
    backendPendings.forEach((backendPending: any) => {
      const backendId = backendPending._id || backendPending.id;
      const pendingAmount = parseFloat(String(backendPending.pendingAmount || 0));

      if (!processedIds.has(backendId) && pendingAmount > 0.01) {
        mergedPendings.push(backendPending);
        processedIds.add(backendId);
      }
    });

    console.log(`✅ Final merged pendings: ${mergedPendings.length}`);

    // Final filter to remove any fully paid invoices
    const finalPendings = mergedPendings.filter((inv: any) => {
      const pendingAmount = parseFloat(String(inv.pendingAmount || 0));
      return pendingAmount > 0.01;
    });

    return finalPendings;
  } catch (error) {
    console.error('Error in getPendingInvoices:', error);
    // Last resort - try local storage
    try {
      const localPendings: any[] = await getLocalData(STORAGE_KEYS.PENDING_INVOICES) || [];
      const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
      const localPendingInvoices = localInvoices
        .filter((inv: Invoice) => {
          const totalAmount = parseFloat(String(inv.total || inv.totalAmount || inv.grandTotal || 0));
          const paidAmount = parseFloat(String(inv.paidAmount || 0));
          return totalAmount > 0 && paidAmount < totalAmount;
        })
        .map((inv: Invoice) => ({
          _id: inv.serverId || inv.id,
          id: inv.id,
          invoiceNumber: inv.number || inv.invoiceNumber,
          clientCustomerName: inv.clientInfo?.name || inv.clientName || '',
          clientCustomerPhone: inv.clientInfo?.phone || inv.clientPhone || '',
          totalAmount: inv.total || inv.totalAmount || inv.grandTotal || 0,
          paidAmount: inv.paidAmount || 0,
          pendingAmount: (inv.total || inv.totalAmount || inv.grandTotal || 0) - (inv.paidAmount || 0),
          products: inv.items ? inv.items.map((item: InvoiceItem) => ({
            itemName: item.name,
            quantity: item.quantity,
            costPerUnit: item.price
          })) : [],
          createdAt: inv.createdAt,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate
        }));

      return [...localPendings, ...localPendingInvoices];
    } catch {
      return [];
    }
  }
};

// Update invoice status (paid, pending, overdue)
export const updateInvoiceStatus = async (invoiceId: string, status: string): Promise<SaveResult<Invoice>> => {
  try {
    const invoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const updatedInvoices = invoices.map((inv: Invoice) =>
      inv.id === invoiceId ? { ...inv, status, statusUpdatedAt: new Date().toISOString() } : inv
    );

    await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);
    await addToPendingSync('update', 'invoice_status', { invoiceId, status });

    return { success: true, invoices: updatedInvoices };
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return { success: false, error: error.message };
  }
};

// ===== PAYMENT MANAGEMENT =====

// Record payment with offline support
export const recordPayment = async (payment: Payment): Promise<SaveResult<Payment>> => {
  try {
    payment.id = payment.id || Date.now().toString();
    payment.recordedAt = new Date().toISOString();

    // Save payment to local storage
    const payments: Payment[] = await getLocalData(STORAGE_KEYS.PAYMENTS) || [];
    const updatedPayments = [...payments, payment];
    await saveLocalData(STORAGE_KEYS.PAYMENTS, updatedPayments);

    // Update local invoice paidAmount immediately
    const invoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const updatedInvoices = invoices.map((inv: Invoice) => {
      if (inv.id === payment.invoiceId || inv.serverId === payment.invoiceId || inv._id === payment.invoiceId) {
        const currentPaid = parseFloat(String(inv.paidAmount || 0));
        const newPaidAmount = currentPaid + parseFloat(String(payment.amount));
        const totalAmount = parseFloat(String(inv.total || inv.totalAmount || inv.grandTotal || 0));
        const newPendingAmount = Math.max(0, totalAmount - newPaidAmount);

        console.log(`💰 Payment recorded for invoice ${inv.id}:`, {
          previousPaid: currentPaid,
          paymentAmount: payment.amount,
          newPaidAmount,
          totalAmount,
          newPendingAmount
        });

        return {
          ...inv,
          paidAmount: newPaidAmount,
          remainingAmount: newPendingAmount,
          pendingAmount: newPendingAmount,
          status: newPendingAmount <= 0.01 ? 'paid' : 'pending'
        };
      }
      return inv;
    });

    console.log('💾 Saving updated invoices to INVOICES storage');
    await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);

    // CRITICAL: Verify the data was actually saved by reading it back
    const verifyInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES);
    const verifiedInvoice = verifyInvoices?.find((inv: Invoice) =>
      inv.id === payment.invoiceId || inv.serverId === payment.invoiceId || inv._id === payment.invoiceId
    );
    console.log('✅ Verified saved invoice:', {
      id: verifiedInvoice?.id,
      paidAmount: verifiedInvoice?.paidAmount,
      pendingAmount: verifiedInvoice?.pendingAmount
    });

    // Clear ALL caches to force fresh read from INVOICES
    console.log('🗑️ Clearing all pending-related caches to force refresh');
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVOICES);
    await AsyncStorage.removeItem('@viveha_pending_cache'); // Clear any other cache keys

    // DO NOT update pending invoices cache - let getPendingInvoices read fresh from INVOICES
    // This ensures the UI always shows the latest payment updates

    /* OLD CODE - REMOVED
    const pendingInvoices = await getLocalData(STORAGE_KEYS.PENDING_INVOICES) || [];
    const updatedPendingInvoices = pendingInvoices
      .map(inv => {
        if ((inv._id || inv.id) === payment.invoiceId) {
          const currentPaid = parseFloat(inv.paidAmount || 0);
          const newPaidAmount = currentPaid + parseFloat(payment.amount);
          const totalAmount = parseFloat(inv.totalAmount || 0);
          const newPendingAmount = totalAmount - newPaidAmount;
          return { 
            ...inv, 
            paidAmount: newPaidAmount,
            pendingAmount: newPendingAmount
          };
        }
        return inv;
      })
      .filter(inv => {
        // Remove fully paid invoices
        const pendingAmount = parseFloat(inv.pendingAmount || 0);
        return pendingAmount > 0.01; // Small threshold for rounding
      });
    await saveLocalData(STORAGE_KEYS.PENDING_INVOICES, updatedPendingInvoices);
    */

    // Try to sync with backend if online
    const clientId = await getClientId();
    const token = await getToken();

    // Check network status
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

    if (!token || !isOnline) {
      console.log('Offline or no token - adding payment to pending sync');
      await addToPendingSync('create', 'payment', payment);
      return { success: true, payment, payments: updatedPayments, synced: false };
    }

    if (clientId && payment.invoiceId) {
      try {
        // Find invoice to get backend ID
        const invoice = updatedInvoices.find((inv: Invoice) =>
          inv.id === payment.invoiceId ||
          inv._id === payment.invoiceId ||
          inv.serverId === payment.invoiceId
        );
        const backendInvoiceId = invoice?.serverId || invoice?._id || payment.invoiceId;

        if (backendInvoiceId) {
          const response = await fetch(`${apiurl}/business/invoices/pay`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientId,
              invoiceId: backendInvoiceId,
              amount: payment.amount,
              method: payment.paymentMethod || 'cash',
              note: payment.notes || payment.note || '',
            }),
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Payment recorded on backend successfully');

            // Clear the pending invoices cache to force fresh fetch
            await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVOICES);

            // Refresh invoices from backend to get latest data
            const refreshedInvoices = await fetchInvoicesFromBackend();
            console.log(`🔄 Refreshed ${refreshedInvoices?.length || 0} invoices from backend after payment`);

            return { success: true, payment, payments: updatedPayments, synced: true };
          } else {
            console.warn('⚠️ Backend payment failed:', data.message);
            await addToPendingSync('create', 'payment', payment);
            return { success: true, payment, payments: updatedPayments, synced: false };
          }
        } else {
          console.log('No backend invoice ID found - adding to pending sync');
          await addToPendingSync('create', 'payment', payment);
          return { success: true, payment, payments: updatedPayments, synced: false };
        }
      } catch (backendError) {
        console.error('Error calling backend payment API:', backendError);
        await addToPendingSync('create', 'payment', payment);
        return { success: true, payment, payments: updatedPayments, synced: false };
      }
    } else {
      await addToPendingSync('create', 'payment', payment);
      return { success: true, payment, payments: updatedPayments, synced: false };
    }
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { success: false, error: error.message };
  }
};

// Get all payments from backend
export const getPayments = async (): Promise<Payment[]> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) {
      console.log('No clientId or token, returning empty payments');
      return [];
    }

    // Fetch all invoices first
    const invoicesResponse = await fetch(`${apiurl}/business/invoices/${clientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!invoicesResponse.ok) {
      throw new Error('Failed to fetch invoices for payments');
    }

    const invoicesData = await invoicesResponse.json();
    const invoices = invoicesData.invoices || [];

    // Now fetch payments for each invoice
    const allPaymentsPromises = invoices.map(async (invoice: any) => {
      try {
        const paymentsResponse = await fetch(
          `${apiurl}/business/invoices/${invoice._id}/payments?clientId=${clientId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!paymentsResponse.ok) {
          return [];
        }

        const paymentsData = await paymentsResponse.json();
        const payments = paymentsData.payments || [];

        // Map payments with invoice info for display
        return payments.map((payment: any) => ({
          id: payment._id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientCustomerName || 'Unknown Client',
          clientPhone: invoice.clientCustomerPhone || '',
          amount: payment.amount,
          method: payment.method || 'cash',
          note: payment.note || '',
          date: payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date().toLocaleDateString(),
          time: payment.paidAt ? new Date(payment.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          createdAt: payment.paidAt || payment.createdAt,
          paymentType: payment.amount >= invoice.totalAmount ? 'full' : 'partial'
        }));
      } catch (error) {
        console.error('Error fetching payments for invoice:', invoice._id, error);
        return [];
      }
    });

    const allPaymentsArrays = await Promise.all(allPaymentsPromises);
    const backendPayments: Payment[] = allPaymentsArrays.flat();

    // CRITICAL: Merge with pending (offline) payments that haven't synced yet
    const pendingSyncItems: PendingSyncItem[] = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const pendingPaymentsData = pendingSyncItems.filter((item: PendingSyncItem) => item.type === 'payment');

    // Load local invoices to look up details for pending payments
    const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];

    const localPendingPayments: Payment[] = pendingPaymentsData.map((item: PendingSyncItem) => {
      const paymentData = item.data;

      // Find invoice details
      const invoice = localInvoices.find((inv: Invoice) =>
        inv.id === paymentData.invoiceId ||
        inv.serverId === paymentData.invoiceId ||
        (inv._id && inv._id === paymentData.invoiceId)
      );

      const totalAmount = parseFloat(String(invoice?.total || invoice?.totalAmount || invoice?.grandTotal || 0));

      return {
        id: item.id, // Use pending item ID
        invoiceId: paymentData.invoiceId,
        invoiceNumber: invoice?.number || invoice?.invoiceNumber || 'Unknown',
        clientName: invoice?.clientInfo?.name || invoice?.clientName || 'Unknown',
        clientPhone: invoice?.clientInfo?.phone || invoice?.clientPhone || '',
        amount: parseFloat(String(paymentData.amount)),
        method: paymentData.paymentMethod || 'cash',
        note: paymentData.notes || paymentData.note || '',
        date: new Date(paymentData.recordedAt || item.timestamp).toLocaleDateString(),
        time: new Date(paymentData.recordedAt || item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: paymentData.recordedAt || item.timestamp,
        paymentType: parseFloat(String(paymentData.amount)) >= totalAmount ? 'full' : 'partial',
        isOffline: true // Flag to potentially show UI indicator
      };
    });

    console.log(`💰 GetPayments: ${backendPayments.length} backend + ${localPendingPayments.length} pending offline`);

    console.log(`💰 GetPayments: ${backendPayments.length} backend + ${localPendingPayments.length} pending offline`);

    // Cache the backend payments for offline use
    if (backendPayments.length > 0) {
      await saveLocalData(STORAGE_KEYS.FETCHED_PAYMENTS, backendPayments);
    }

    // Combine and sort by date (newest first)
    const allPayments = [...backendPayments, ...localPendingPayments].sort((a, b) =>
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );

    return allPayments;
  } catch (error) {
    console.error('Error getting payments from backend:', error);

    // OFFLINE FALLBACK: Use cached payments + pending
    try {
      console.log('📴 Offline/Error getting payments - using cached data');

      // Get cached backend payments
      const cachedPayments: Payment[] = await getLocalData(STORAGE_KEYS.FETCHED_PAYMENTS) || [];

      // Get pending (unsynced) payments
      const pendingSyncItems: PendingSyncItem[] = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
      const pendingPaymentsData = pendingSyncItems.filter((item: PendingSyncItem) => item.type === 'payment');
      const localInvoices: Invoice[] = await getLocalData(STORAGE_KEYS.INVOICES) || [];

      const localPendingPayments: Payment[] = pendingPaymentsData.map((item: PendingSyncItem) => {
        const paymentData = item.data;
        const invoice = localInvoices.find((inv: Invoice) =>
          inv.id === paymentData.invoiceId ||
          inv.serverId === paymentData.invoiceId ||
          (inv._id && inv._id === paymentData.invoiceId)
        );
        const totalAmount = parseFloat(String(invoice?.total || invoice?.totalAmount || invoice?.grandTotal || 0));

        return {
          id: item.id,
          invoiceId: paymentData.invoiceId,
          invoiceNumber: invoice?.number || invoice?.invoiceNumber || 'Unknown',
          clientName: invoice?.clientInfo?.name || invoice?.clientName || 'Unknown',
          clientPhone: invoice?.clientInfo?.phone || invoice?.clientPhone || '',
          amount: parseFloat(String(paymentData.amount)),
          method: paymentData.paymentMethod || 'cash',
          note: paymentData.notes || paymentData.note || '',
          date: new Date(paymentData.recordedAt || item.timestamp).toLocaleDateString(),
          time: new Date(paymentData.recordedAt || item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          createdAt: paymentData.recordedAt || item.timestamp,
          paymentType: parseFloat(String(paymentData.amount)) >= totalAmount ? 'full' : 'partial',
          isOffline: true
        };
      });

      // Merge cached + pending
      const allPayments = [...cachedPayments, ...localPendingPayments].sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      return allPayments;

    } catch (localError) {
      console.error('Error serving offline payments:', localError);
      return [];
    }
  }
};

// Get payments for specific invoice
export const getInvoicePayments = async (invoiceId: string): Promise<Payment[]> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    // Try to fetch from backend first
    if (clientId && token) {
      try {
        const netInfo = await NetInfo.fetch();
        const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

        if (isOnline) {
          const response = await fetch(
            `${apiurl}/business/invoices/${invoiceId}/payments?clientId=${clientId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            const payments = data.payments || [];

            // Map payments to frontend format
            const mappedPayments = payments.map((payment: any) => ({
              id: payment._id,
              invoiceId: invoiceId,
              amount: payment.amount,
              method: payment.method || 'cash',
              paymentMethod: payment.method || 'cash',
              note: payment.note || '',
              notes: payment.note || '',
              date: payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date().toLocaleDateString(),
              time: payment.paidAt ? new Date(payment.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
              paidAt: payment.paidAt,
              createdAt: payment.paidAt || payment.createdAt,
            }));

            console.log(`💰 Fetched ${mappedPayments.length} payments for invoice ${invoiceId}`);
            return mappedPayments;
          }
        }
      } catch (backendError) {
        console.log('Error fetching from backend, falling back to local data:', backendError);
      }
    }

    // Fallback: get from local payments
    const payments = await getPayments();
    const invoicePayments = payments.filter((p: Payment) => p.invoiceId === invoiceId);
    console.log(`💰 Found ${invoicePayments.length} local payments for invoice ${invoiceId}`);
    return invoicePayments;
  } catch (error) {
    console.error('Error getting invoice payments:', error);
    return [];
  }
};

// ===== DRAFT MANAGEMENT =====

// Save draft with offline support
export const saveDraft = async (draft: Draft): Promise<SaveResult<Draft>> => {
  try {
    draft.id = draft.id || Date.now().toString();
    draft.savedAt = new Date().toISOString();

    const drafts: Draft[] = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    const existingIndex = drafts.findIndex((d: Draft) => d.id === draft.id);

    let updatedDrafts: Draft[];
    if (existingIndex >= 0) {
      updatedDrafts = [...drafts];
      updatedDrafts[existingIndex] = draft;
    } else {
      updatedDrafts = [...drafts, draft];
    }

    await saveLocalData(STORAGE_KEYS.DRAFTS, updatedDrafts);

    return { success: true, draft, drafts: updatedDrafts };
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return { success: false, error: error.message };
  }
};

// Delete draft
export const deleteDraft = async (draftId: string): Promise<SaveResult<Draft>> => {
  try {
    const drafts: Draft[] = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    const updatedDrafts = drafts.filter((d: Draft) => d.id !== draftId);

    await saveLocalData(STORAGE_KEYS.DRAFTS, updatedDrafts);

    return { success: true, drafts: updatedDrafts };
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return { success: false, error: error.message };
  }
};

// Get all drafts
export const getDrafts = async (): Promise<Draft[]> => {
  try {
    return await getLocalData(STORAGE_KEYS.DRAFTS) || [];
  } catch (error) {
    console.error('Error getting drafts:', error);
    return [];
  }
};

// ===== SYNC STATUS =====

// Get pending sync count by type
export const getPendingSyncByType = async (): Promise<PendingSyncByType> => {
  try {
    const pending = await getPendingSyncItems();
    const byType: PendingSyncByType = {
      item: 0,
      client: 0,
      invoice: 0,
      payment: 0,
      total: pending.length
    };

    pending.forEach((item: PendingSyncItem) => {
      if (byType[item.type as keyof PendingSyncByType] !== undefined) {
        byType[item.type as keyof PendingSyncByType]++;
      }
    });

    return byType;
  } catch (error) {
    console.error('Error getting pending sync by type:', error);
    return { item: 0, client: 0, invoice: 0, payment: 0, total: 0 };
  }
};

// Remove specific pending sync item
export const removePendingSyncItem = async (itemId: string): Promise<boolean> => {
  try {
    const pending = await getPendingSyncItems();
    const updated = pending.filter((item: PendingSyncItem) => item.id !== itemId);
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, updated);
    return true;
  } catch (error) {
    console.error('Error removing pending sync item:', error);
    return false;
  }
};

// Get draft by ID
export const getDraft = async (draftId: string): Promise<Draft | null> => {
  try {
    const drafts: Draft[] = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    return drafts.find((d: Draft) => d.id === draftId) || null;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
};

// Create invoice via backend API (direct products flow - no cart)
export const createInvoiceViaBackend = async (invoiceData: any): Promise<{ success: boolean; invoice?: any; error?: string }> => {
  try {
    const clientId = await getClientId();
    const token = await AsyncStorage.getItem('@viveha_token');

    if (!clientId || !token) {
      throw new Error('Authentication required');
    }

    // Format products array for backend with required fields
    const products: Product[] = invoiceData.items.map((item: any) => ({
      productId: item.serverId || item.id,
      quantity: item.quantity || 1,
      costPerUnit: item.price || 0,
      itemName: item.name || 'Unknown Item',
    }));

    console.log('Creating invoice with products:', products);
    console.log('📤 Sending to backend - Client info:', {
      name: invoiceData.clientInfo?.name,
      phone: invoiceData.clientInfo?.phone,
      address: invoiceData.clientInfo?.address,
      email: invoiceData.clientInfo?.email,
      gstNo: invoiceData.clientInfo?.gstNo,
    });

    const requestPayload = {
      clientId,
      clientCustomerName: invoiceData.clientInfo?.name || '',
      clientCustomerPhone: invoiceData.clientInfo?.phone || '',
      clientCustomerAddress: invoiceData.clientInfo?.address || '',
      clientCustomerEmailId: invoiceData.clientInfo?.email || invoiceData.clientInfo?.emailId || '',
      clientCustomerGstNo: invoiceData.clientInfo?.gstNo || '',
      invoiceNumber: invoiceData.number,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      subtotal: invoiceData.subTotal || 0,
      totalTax: invoiceData.tax || 0,
      totalDiscount: invoiceData.discount || 0,
      totalAmount: invoiceData.total || invoiceData.grandTotal,
      paidAmount: invoiceData.paidAmount || 0,
      products: products,
      notes: invoiceData.notes || '',
      additionalFees: invoiceData.additionalFees || []
    };

    // Create invoice with products directly (no cart needed)
    const invoiceResponse = await fetch(`${apiurl}/business/invoices/generatewithproducts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    });

    const invoiceData_response = await invoiceResponse.json();
    console.log('Invoice creation response:', invoiceData_response);

    if (invoiceData_response.success) {
      return { success: true, invoice: invoiceData_response.invoice };
    } else {
      throw new Error(invoiceData_response.message || 'Failed to generate invoice');
    }
  } catch (error: any) {
    console.error('Error creating invoice via backend:', error);
    return { success: false, error: error.message };
  }
};

// ===== USER ISOLATION =====

// Clear all user data on logout to prevent data leakage between users
export const clearAllUserData = async (): Promise<boolean> => {
  try {
    const keys = [
      STORAGE_KEYS.ITEMS,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.INVOICES,
      STORAGE_KEYS.PAYMENTS,
      STORAGE_KEYS.DRAFTS,
      STORAGE_KEYS.PENDING_SYNC,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.ITEM_GROUPS,
      STORAGE_KEYS.PENDING_INVOICES,
      STORAGE_KEYS.FETCHED_PAYMENTS,
      '@viveha_client_id',
      '@viveha_token',
      '@viveha_user_data',
      '@viveha_cart',
      '@viveha_payment_history',
      '@viveha_shop_details',
      '@debug_invoice_count'
    ];

    await AsyncStorage.multiRemove(keys);
    cachedClientId = null;
    return true;
  } catch (error) {
    console.error('Error clearing user data:', error);
    return false;
  }
};

// Clear only cached data (keep auth tokens)
export const clearCachedData = async (): Promise<boolean> => {
  try {
    console.log('🧹 Clearing cached data (keeping authentication)...');
    const keys = [
      STORAGE_KEYS.ITEMS,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.INVOICES,
      STORAGE_KEYS.PAYMENTS,
      STORAGE_KEYS.DRAFTS,
      STORAGE_KEYS.PENDING_SYNC,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.ITEM_GROUPS,
      STORAGE_KEYS.PENDING_INVOICES,
      STORAGE_KEYS.FETCHED_PAYMENTS,
      '@viveha_cart',
      '@viveha_payment_history',
      '@debug_invoice_count',
      '@viveha_pendings'
    ];

    await AsyncStorage.multiRemove(keys);
    console.log('✅ Cached data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cached data:', error);
    return false;
  }
};

// Fetch client profile (shop details) from backend
export const fetchClientProfile = async (): Promise<ShopDetails | null> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();
    if (!clientId || !token) return null;

    const response = await fetch(`${apiurl}/auth/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success && data.client) {
      const shopDetails: ShopDetails = {
        shopName: data.client.shopName || data.client.businessName || 'My Shop',
        location: data.client.location || '',
        city: data.client.city || '',
        state: data.client.state || '',
        ownerName: data.client.ownerName || '',
        phoneNumber: data.client.phoneNumber || '',
        invoiceCount: data.client.invoiceCount || 0,
        profileImage: data.client.profileUrl || '',
        gstin: data.client.gstin || ''
      };
      await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(shopDetails));
      console.log('✅ Client profile fetched and saved:', shopDetails.location);
      return shopDetails;
    }
    return null;
  } catch (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }
};

// Fetch all user data from backend with clientId isolation
export const fetchAllUserData = async (): Promise<FetchAllDataResult> => {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return { success: false, error: 'No client ID found' };
    }

    if (!clientId) {
      return { success: false, error: 'No client ID found' };
    }

    // Fetch items, clients, invoices, groups, and profile in parallel
    const [items, clients, invoices, groups, profile] = await Promise.all([
      fetchItemsFromBackend(),
      fetchClientsFromBackend(),
      fetchInvoicesFromBackend(),
      fetchItemGroupsFromBackend(),
      fetchClientProfile()
    ]);

    return {
      success: true,
      data: {
        items,
        clients,
        invoices: invoices || [],
        groups,
        profile
      }
    };
  } catch (error: any) {
    console.error('Error fetching all user data:', error);
    return { success: false, error: error.message };
  }
};

// ===== ITEM GROUP MANAGEMENT =====

// Fetch item groups from backend
export const fetchItemGroupsFromBackend = async (): Promise<ItemGroup[]> => {
  try {
    const clientId = await getClientId();
    if (!clientId) return [];

    const token = await getToken();
    if (!token) return [];

    const response = await fetch(`${apiurl}/business/item-groups/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (data.success && data.itemGroups) {
      const groups: ItemGroup[] = data.itemGroups.map((g: any) => ({
        id: g._id,
        serverId: g._id,
        name: g.name,
        description: g.description,
        createdAt: g.createdAt,
      }));

      await saveLocalData(STORAGE_KEYS.ITEM_GROUPS, groups);
      return groups;
    }
    return [];
  } catch (error) {
    console.error('Error fetching item groups:', error);
    return [];
  }
};

// Get item groups (Offline first)
export const getItemGroups = async (): Promise<ItemGroup[]> => {
  try {
    // Try local first
    const localGroups: ItemGroup[] = await getLocalData(STORAGE_KEYS.ITEM_GROUPS) || [];

    // If online, try to fetch fresh
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      const backendGroups = await fetchItemGroupsFromBackend();
      if (backendGroups.length > 0 || (backendGroups.length === 0 && localGroups.length === 0)) {
        return backendGroups;
      }
    }

    return localGroups;
  } catch (error) {
    console.error('Error getting item groups:', error);
    return [];
  }
};

// Create Item Group
export const createItemGroupInBackend = async (groupData: { name: string; description?: string }): Promise<SaveResult<ItemGroup>> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    const payload = {
      clientId,
      name: groupData.name,
      description: groupData.description || ''
    };

    // Online
    if (clientId && token) {
      const response = await fetch(`${apiurl}/business/item-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success && data.itemGroup) {
        return {
          success: true, group: {
            id: data.itemGroup._id,
            serverId: data.itemGroup._id,
            name: data.itemGroup.name,
            description: data.itemGroup.description,
            createdAt: data.itemGroup.createdAt
          }
        };
      }
    }

    // Offline or failed - currently we just return error as groups are less critical to be offline-created than invoices?
    // User requested "make it work appropriately". Let's support offline creation if possible, but API docs imply online for ID generation.
    // For now, let's stick to online-only for simplicity unless user complains, or standard "save locally with temp ID".
    // Let's implement basic offline support: save locally with temp ID.

    // NOTE: The previous local implementation generated IDs.
    // We will return specific error if offline so UI can handle or we save locally.
    // Let's save locally for consistency with other features.

    const tempGroup: ItemGroup = {
      id: Date.now().toString(),
      name: groupData.name,
      description: groupData.description,
      createdAt: new Date().toISOString()
      // No serverId means it's local only
    };

    // We need a way to sync these later... currently `syncWithServer` doesn't handle groups. 
    // For now, let's just save to local storage and return success, but warn it's local.
    // Ideally we add to pending sync, but that requires updating `syncWithServer`.
    // Given the task "don't change backend code", we can't change backend.
    // Updating `syncWithServer` is frontend code.

    // Offline or failed
    console.log('Online group creation failed or offline. Saving locally and queuing.');

    // Save locally
    /* Note: The caller (ItemsScreen) is responsible for updating the state/storage 
       based on the return value for immediate UI update. 
       However, to ensure it persists in the queue, we must add to sync queue here.
    */

    await addToPendingSync('create', 'group', tempGroup);

    return { success: true, group: tempGroup, offline: true };

  } catch (error: any) {
    console.error('Error creating group:', error);
    const tempGroup: ItemGroup = {
      id: Date.now().toString(),
      name: groupData.name,
      description: groupData.description,
      createdAt: new Date().toISOString()
    };
    await addToPendingSync('create', 'group', tempGroup);
    return { success: true, group: tempGroup, offline: true };
  }
};

// Update Item Group
export const updateItemGroupInBackend = async (groupId: string, groupData: { name: string; description?: string }): Promise<SaveResult<ItemGroup>> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    // If it's a local-only group (no serverId/short ID), we can't update on backend yet.
    // But passing `groupId` usually means we have reference.

    if (clientId && token && groupId.length === 24) { // MongoDB ObjectId check approx
      // Try online
      try {
        const response = await fetch(`${apiurl}/business/item-groups/${clientId}/${groupId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(groupData)
        });
        const data = await response.json();
        if (data.success) return { success: true };
      } catch (err) {
        console.log('Group update failed (likely offline). Queuing.', err);
      }
    }

    // Queue for sync
    // For updates, we need the group ID. If it's a local group (temp ID), 
    // we should update our local records (caller does this) and the pending 'create' action 
    // might need to be updated? 
    // Actually, if we have a pending 'create' for this item, we should update THAT item in the queue.
    // But `addToPendingSync` just appends. 
    // Simplification: Just add 'update' action. If the ID is local, the sync logic handles it 
    // (create logic returns new ID, subsequent update logic might fail if it uses old ID... 
    // BUT we don't have complex dependency tracking here. 
    // Ideally, for a local item, we update the original 'create' payload in the queue.

    // Check if there is a pending create for this group
    const pending = await getPendingSyncItems();
    const pendingCreate = pending.find((p: PendingSyncItem) => p.type === 'group' && p.action === 'create' && p.data.id === groupId);

    if (pendingCreate) {
      // Update the existing pending creation
      pendingCreate.data = { ...pendingCreate.data, ...groupData };
      // Update queue
      const updatedQueue = pending.map((p: PendingSyncItem) => p.id === pendingCreate.id ? pendingCreate : p);
      await saveLocalData(STORAGE_KEYS.PENDING_SYNC, updatedQueue);
      return { success: true, offline: true };
    }

    // Normal update queueing
    await addToPendingSync('update', 'group', { ...groupData, id: groupId, serverId: groupId.length === 24 ? groupId : null });
    return { success: true, offline: true }; // Assume updated locally by caller
  } catch (error) {
    console.error('Error updating group:', error);
    return { success: true, offline: true };
  }
};

// Delete Item Group
export const deleteItemGroupInBackend = async (groupId: string): Promise<SaveResult<ItemGroup>> => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (clientId && token && groupId.length === 24) {
      try {
        await fetch(`${apiurl}/business/item-groups/${clientId}/${groupId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return { success: true };
      } catch (err) {
        console.log('Group delete failed (likely offline). Queuing.', err);
      }
    }

    // Queue delete
    // If it's a local group in pending create, remove it from queue
    const pending = await getPendingSyncItems();
    const pendingCreate = pending.find((p: PendingSyncItem) => p.type === 'group' && p.action === 'create' && p.data.id === groupId);

    if (pendingCreate) {
      await removeFromPendingSync(pendingCreate.id);
      return { success: true, offline: true };
    }

    await addToPendingSync('delete', 'group', { id: groupId });
    return { success: true, offline: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: true, offline: true };
  }
};

// Fetch dashboard insights from backend
export const getDashboardInsights = async (months: number = 6, limit: number = 5): Promise<DashboardInsights | null> => {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      console.log('No clientId found');
      return null;
    }

    const token = await getToken();

    // Try online fetch first
    if (token) {
      try {
        const response = await fetch(`${apiurl}/dashboard?months=${months}&limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok && data) {
          console.log('✅ Dashboard insights fetched from backend');
          // Cache the data
          await saveLocalData(STORAGE_KEYS.DASHBOARD, data);
          return { data, source: 'online' };
        }
      } catch (networkError) {
        console.log('Network request for dashboard failed, falling back to cache');
      }
    }

    // Fallback to cache (offline or error)
    const cachedData = await getLocalData(STORAGE_KEYS.DASHBOARD);
    if (cachedData) {
      console.log('📂 Dashboard insights loaded from cache');
      return { data: cachedData, source: 'cache' };
    }

    return null;
  } catch (error) {
    console.error('Error getting dashboard insights:', error);
    return null;
  }
};

// ============================================================================
// REMINDER API FUNCTIONS
// ============================================================================

export interface Reminder {
  id: string;
  clientId: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  amount: number;
  reminderDate: string;
  message?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderNotification {
  id: string;
  type: 'reminder';
  title: string;
  message: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  timestamp: number;
  reminderDate: number;
  read: boolean;
  status: string;
}

// Create a new reminder
export const createReminder = async (reminderData: {
  customerName: string;
  customerPhone: string;
  customerId?: string;
  amount: number;
  reminderDate: Date;
  message?: string;
}): Promise<SaveResult<Reminder>> => {
  try {
    const token = await getToken();

    if (!token) {
      console.error('❌ No authentication token found');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('📤 Creating reminder:', {
      customerName: reminderData.customerName,
      amount: reminderData.amount,
      reminderDate: reminderData.reminderDate.toISOString(),
    });

    const requestBody = {
      ...reminderData,
      reminderDate: reminderData.reminderDate.toISOString(), // Ensure proper date format
    };

    console.log('📡 Sending to:', `${apiurl}/reminders`);

    const response = await fetch(`${apiurl}/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    const data = await response.json();
    console.log('📥 Response data:', data);

    if (!response.ok) {
      console.error('❌ Server error:', data.error || 'Failed to create reminder');
      return { success: false, error: data.error || 'Failed to create reminder' };
    }

    console.log('✅ Reminder created successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Network/Parse error creating reminder:', error);
    return { success: false, error: error.message || 'Failed to create reminder' };
  }
};

// Get all reminders for the client
export const getReminders = async (filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Reminder[]> => {
  try {
    const token = await getToken();

    if (!token) {
      console.log('No token found');
      return [];
    }

    let url = `${apiurl}/reminders`;
    const params = new URLSearchParams();

    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch reminders:', data.error);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return [];
  }
};

// Get pending reminders as notifications
export const getReminderNotifications = async (): Promise<ReminderNotification[]> => {
  try {
    const token = await getToken();

    if (!token) {
      console.log('No token found');
      return [];
    }

    const response = await fetch(`${apiurl}/reminders/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch reminder notifications:', data.error);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    console.error('Error fetching reminder notifications:', error);
    return [];
  }
};

// Update reminder status (mark as read, cancelled, etc.)
export const updateReminderStatus = async (
  reminderId: string,
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
): Promise<SaveResult<Reminder>> => {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${apiurl}/reminders/${reminderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update reminder' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating reminder status:', error);
    return { success: false, error: error.message || 'Failed to update reminder' };
  }
};

// Delete a reminder
export const deleteReminder = async (reminderId: string): Promise<SaveResult<Reminder>> => {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${apiurl}/reminders/${reminderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete reminder' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting reminder:', error);
    return { success: false, error: error.message || 'Failed to delete reminder' };
  }
};

// Delete all reminders (clear all notifications)
export const deleteAllReminders = async (): Promise<SaveResult<any>> => {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${apiurl}/reminders`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete all reminders' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting all reminders:', error);
    return { success: false, error: error.message || 'Failed to delete all reminders' };
  }
};

