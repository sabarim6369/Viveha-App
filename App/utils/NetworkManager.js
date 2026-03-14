import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiurl from '../api';

// Get clientId from storage
// Get clientId from storage
let cachedClientId = null;
let isSyncing = false; // Sync lock to prevent race conditions

export const getClientId = async () => {
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

export const setClientId = async (clientId) => {
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
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('@viveha_token');
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Hook to monitor network status
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isConnected || !isInternetReachable;
      const isNowOnline = state.isConnected && state.isInternetReachable;

      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);

      // When connection is restored, sync pending changes
      if (wasOffline && isNowOnline) {
        console.log('🌐 Connection restored! Syncing pending changes...');
        syncWithServer().then(result => {
          if (result.success) {
            console.log(`✅ Synced ${result.synced} items to backend`);
          } else {
            console.log('⚠️ Sync failed:', result.error);
          }
        }).catch(err => {
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
  USER_SETTINGS: '@viveha_user_settings',
};

// Save data locally
export const saveLocalData = async (key, data) => {
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
export const getLocalData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting local data:', error);
    return null;
  }
};

// Add to pending sync queue
export const addToPendingSync = async (action, type, data) => {
  try {
    const pendingSync = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const newItem = {
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
export const getPendingSyncItems = async () => {
  try {
    return await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
  } catch (error) {
    console.error('Error getting pending sync:', error);
    return [];
  }
};

// Remove specific item from pending sync
export const removeFromPendingSync = async (id) => {
  try {
    const pendingSync = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const updatedSync = pendingSync.filter(item => item.id !== id);
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, updatedSync);
    return true;
  } catch (error) {
    console.error('Error removing from pending sync:', error);
    return false;
  }
};

// Clear pending sync after successful sync (Deprecated for bulk clear, but kept for reset)
export const clearPendingSync = async () => {
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
const syncItemsToBackend = async (clientId, items) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing items');
      return false;
    }

    const promises = items.map(async (pendingItem) => {
      const item = pendingItem.data;
      const action = pendingItem.action;

      const payload = {
        clientId,
        name: item.name,
        price: item.amount || item.price,
        stock: item.stock || 0,
        unit: item.unit || 'nos',
        groupId: item.groupId || null,
        description: item.description || '',
        dealerIds: item.dealerIds || (item.dealerId ? [item.dealerId] : []),
        purchasePrice: item.purchasePrice || null,
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
          const localItems = await getLocalData(STORAGE_KEYS.ITEMS) || [];
          const updatedItems = localItems.map(i => i.id === item.id ? { ...i, serverId: resData.item._id } : i);
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
const syncClientsToBackend = async (clientId, clients) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing clients');
      return false;
    }

    const promises = clients.map(async (pendingClient) => {
      const client = pendingClient.data;
      const action = pendingClient.action;

      const payload = {
        clientId,
        name: client.name,
        phone: client.phone,
      };

      // Add optional fields if present or fallback to N/A
      payload.address = client.address || 'N/A';
      payload.emailId = client.emailId || 'N/A';
      payload.gstNo = client.gstNo || 'N/A';

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
          const localClients = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
          const updatedClients = localClients.map(c => c.id === client.id ? { ...c, serverId: resData.clientCustomer._id } : c);
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
const syncInvoicesToBackend = async (clientId, invoices) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing invoices');
      return false;
    }

    // invoices is an array of pending wrapper objects: { id, data, ... }
    const promises = invoices.map(async (pendingItem) => {
      try {
        const invoice = pendingItem.data; // Extract actual invoice data

        // CRITICAL: Check if invoice has items without VALID serverIds (offline items often have timestamp IDs)
        const itemsWithoutServerIds = (invoice.items || []).filter(item =>
          !item.serverId || (typeof item.serverId === 'string' && item.serverId.length !== 24)
        );

        if (itemsWithoutServerIds.length > 0) {
          console.log(`⚠️ Invoice has ${itemsWithoutServerIds.length} items without serverIds, need to sync items first`);

          // Try to get updated items from local storage (they might have been synced)
          const localItems = await getLocalData(STORAGE_KEYS.ITEMS) || [];

          // Update invoice items with serverIds if available
          const updatedInvoiceItems = (invoice.items || []).map(invoiceItem => {
            if (!invoiceItem.serverId || invoiceItem.serverId.length !== 24) {
              // Try multiple matching strategies:
              // 1. Match by serverId (invoice item's serverId might be the old item's local id)
              // 2. Match by item id
              // 3. Match by name as fallback
              const syncedItem = localItems.find(li =>
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
          const stillMissingServerIds = updatedInvoiceItems.filter(item => !item.serverId);
          if (stillMissingServerIds.length > 0) {
            console.log(`❌ Cannot sync invoice: ${stillMissingServerIds.length} items still missing serverIds`);
            console.log('Missing items:', stillMissingServerIds.map(i => i.name).join(', '));
            return { success: false, error: 'Items not synced yet' };
          }

          // Update invoice with items that now have serverIds
          invoice.items = updatedInvoiceItems;
        }

        // Format products array for backend
        const products = (invoice.items || []).map(item => ({
          productId: item.serverId || item.id,
          quantity: item.quantity || 1,
        }));

        // Validate all products have valid serverIds (24-char MongoDB ObjectIds)
        const invalidProducts = products.filter(p => !p.productId || typeof p.productId !== 'string' || p.productId.length !== 24);
        if (invalidProducts.length > 0) {
          const invalidProductNames = invoice.items
            .filter((item, idx) => invalidProducts.some(ip => products[idx]?.productId === ip.productId))
            .map(item => item.name)
            .join(', ');
          console.log(`❌ Cannot sync invoice: ${invalidProducts.length} items have invalid productIds`);
          console.log(`   Invalid items: ${invalidProductNames}`);
          console.log(`   ProductIds:`, invalidProducts.map(p => p.productId));
          return { success: false, error: 'Items not yet synced to backend' };
        }

        // Use the direct products route
        // Resolve clientCustomerId from local clients to ensure backend uses existing client
        // This prevents the "Address is required" error when backend tries to create a new client
        let clientCustomerId = invoice.clientInfo?.serverId || null;

        if (!clientCustomerId) {
          const localClients = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
          const clientPhone = invoice.clientInfo?.phone || invoice.clientPhone || '';

          if (clientPhone) {
            const matchedClient = localClients.find(c =>
              c.phone === clientPhone ||
              (c.phoneNumbers && c.phoneNumbers[0]?.number === clientPhone)
            );

            if (matchedClient && matchedClient.serverId) {
              console.log(`✅ Found existing client for invoice: ${matchedClient.name} (${matchedClient.serverId})`);
              clientCustomerId = matchedClient.serverId;
            }
          }
        }

        const invoicePayload = {
          clientId,
          clientCustomerId, // CRITICAL: Send this to avoid "Address is required" error
          clientCustomerName: invoice.clientInfo?.name || invoice.clientName || '',
          clientCustomerPhone: invoice.clientInfo?.phone || invoice.clientPhone || '',
          clientCustomerAddress: invoice.clientInfo?.address || 'N/A',
          clientCustomerEmail: invoice.clientInfo?.emailId || 'N/A',
          clientCustomerGST: invoice.clientInfo?.gstNo || 'N/A',
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
          const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
          const updatedInvoices = localInvoices.map(inv => {
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
      } catch (error) {
        console.log('Failed to sync invoice (expected when offline):', error.message);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.success);
    return allSuccess;
  } catch (error) {
    console.log('Failed to sync invoices (expected when offline):', error.message);
    return false;
  }
};

// Sync groups to backend
const syncGroupsToBackend = async (clientId, groups) => {
  try {
    const token = await getToken();
    if (!token) return false;

    const promises = groups.map(async (pendingGroup) => {
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
            const localGroups = await getLocalData(STORAGE_KEYS.ITEM_GROUPS) || [];
            const updatedGroups = localGroups.map(g => g.id === group.id ? {
              ...g,
              serverId: resData.itemGroup._id,
              _id: resData.itemGroup._id
            } : g);
            await saveLocalData(STORAGE_KEYS.ITEM_GROUPS, updatedGroups);
            await removeFromPendingSync(pendingGroup.id);
          }
          return resData;
        }
      } catch (err) {
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
const syncPaymentsToBackend = async (clientId, paymentItems) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing payments');
      return false;
    }

    console.log(`💰 Syncing ${paymentItems.length} payments...`);

    const promises = paymentItems.map(async (paymentItem) => {
      try {
        const payment = paymentItem.data;

        // Get the invoice from local storage to find backend ID
        const invoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
        const invoice = invoices.find(inv =>
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
      } catch (error) {
        console.error('❌ Error syncing payment:', error);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.success);

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

// Sync settings to backend
const syncSettingsToBackend = async (clientId, settingsItems) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('⚠️ No token for syncing settings');
      return false;
    }

    console.log(`⚙️ Syncing ${settingsItems.length} settings...`);

    const promises = settingsItems.map(async (settingItem) => {
      try {
        const settings = settingItem.data;

        const url = `${apiurl}/client/${clientId}`;
        console.log('📤 Sending settings update:', {
          clientId,
          customerFields: settings.customerFields,
        });
        console.log('📍 URL:', url);

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientSettings: {
              customerFields: settings.customerFields,
            },
          }),
        });

        const data = await response.json();
        console.log('📡 Settings sync response:', data);

        if (!response.ok) {
          console.error(`❌ Settings sync failed with status ${response.status}:`, data.message);
          return { success: false, error: data.message || 'Server error' };
        }

        if (data.success) {
          console.log(`✅ Settings synced successfully`);
          await removeFromPendingSync(settingItem.id);
          return { success: true };
        } else {
          console.error(`❌ Settings sync returned success=false:`, data.message);
          return { success: false, error: data.message };
        }
      } catch (error) {
        console.error('❌ Error syncing individual settings:', error);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.success);

    if (allSuccess) {
      console.log('✅ All settings synced successfully');
    } else {
      console.log('⚠️ Some settings failed to sync:', results.filter(r => !r.success));
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ Error syncing settings:', error);
    return false;
  }
};

// Sync dealers to backend
const syncDealersToBackend = async (clientId, dealers) => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('No token for syncing dealers');
      return false;
    }

    const promises = dealers.map(async (pendingDealer) => {
      const dealer = pendingDealer.data;
      const action = pendingDealer.action;

      const payload = {
        clientId,
        name: dealer.businessName || dealer.name,
        contactPerson: dealer.contactPerson || '',
        phoneNumber: dealer.phoneNumber || '',
        email: dealer.emailAddress || dealer.email || '',
        address: dealer.officeAddress || dealer.address || '',
        logoUrl: dealer.logo || dealer.logoUrl || ''
      };

      if (action === 'delete') {
        const response = await fetch(`${apiurl}/dealer/${clientId}/${dealer.serverId || dealer.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await response.json();
        await removeFromPendingSync(pendingDealer.id);
        return resData;
      } else if (dealer.serverId) {
        const response = await fetch(`${apiurl}/dealer/${clientId}/${dealer.serverId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();
        if (resData.success) await removeFromPendingSync(pendingDealer.id);
        return resData;
      } else {
        const response = await fetch(`${apiurl}/dealer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();

        if (resData.success && resData.dealer) {
          const localDealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
          const updatedDealers = localDealers.map(d => d.id === dealer.id ? {
            ...d,
            serverId: resData.dealer._id,
            id: resData.dealer._id
          } : d);
          await saveLocalData(STORAGE_KEYS.DEALERS, updatedDealers);
          await removeFromPendingSync(pendingDealer.id);
          console.log(`✅ Dealer "${dealer.businessName || dealer.name}" synced successfully`);
        }
        return resData;
      }
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error syncing dealers:', error);
    return false;
  }
};

// Sync with server
export const syncWithServer = async () => {
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
    const itemsToSync = pendingItems.filter(p => p.type === 'item');
    const clientsToSync = pendingItems.filter(p => p.type === 'client');
    const invoicesToSync = pendingItems.filter(p => p.type === 'invoice');
    const paymentsToSync = pendingItems.filter(p => p.type === 'payment');
    const groupsToSync = pendingItems.filter(p => p.type === 'group');
    const settingsToSync = pendingItems.filter(p => p.type === 'settings');
    const dealersToSync = pendingItems.filter(p => p.type === 'dealer');

    console.log(`🔄 Syncing: ${itemsToSync.length} items, ${clientsToSync.length} clients, ${invoicesToSync.length} invoices, ${paymentsToSync.length} payments, ${groupsToSync.length} groups, ${settingsToSync.length} settings, ${dealersToSync.length} dealers`);

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

    // Sync settings to backend
    if (settingsToSync.length > 0) {
      console.log(`⚙️ Syncing ${settingsToSync.length} settings to backend...`);
      const success = await syncSettingsToBackend(clientId, settingsToSync);
      if (!success) {
        console.log('⚠️ Settings sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Settings synced successfully`);
      }
    }

    // Sync dealers to backend
    if (dealersToSync.length > 0) {
      console.log(`🏢 Syncing ${dealersToSync.length} dealers to backend...`);
      const success = await syncDealersToBackend(clientId, dealersToSync);
      if (!success) {
        console.log('⚠️ Dealers sync had issues');
        syncSuccess = false;
      } else {
        console.log(`✅ Dealers synced successfully`);
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
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
};

// Get last sync time
export const getLastSyncTime = async () => {
  try {
    return await getLocalData(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

// ===== ITEM MANAGEMENT =====

// Fetch items from backend
export const fetchItemsFromBackend = async () => {
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
      const items = data.items.map(item => ({
        id: item._id,
        serverId: item._id,
        name: item.name,
        amount: item.price,
        price: item.price,
        stock: item.stock,
        unit: item.unit,
        lowStockQuantity: item.lowStockQuantity || 5,
        groupId: item.groupId,
        groupName: item.groupName || '',
        description: item.description || '',
        dealerIds: item.dealerIds || [],
        dealerId: (item.dealerIds && item.dealerIds.length > 0) ? item.dealerIds[0] : null,
        purchasePrice: item.purchasePrice || null,
        createdAt: item.createdAt,
      }));

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
export const saveItem = async (item, isUpdate = false) => {
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

    const items = await getLocalData(STORAGE_KEYS.ITEMS) || [];

    // Try to sync with backend immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      try {
        const payload = {
          clientId,
          name: item.name,
          price: item.amount || item.price,
          stock: item.stock || 0,
          unit: item.unit || 'nos',
          description: item.description || '',
          dealerIds: item.dealerIds || (item.dealerId ? [item.dealerId] : []),
          lowStockQuantity: item.lowStockQuantity || 5,
          groupId: item.groupId || null,
          purchasePrice: item.purchasePrice || null,
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
          // Update with server data
          const savedItem = {
            id: item.id,
            serverId: data.item._id,
            name: data.item.name,
            amount: data.item.price,
            price: data.item.price,
            stock: data.item.stock,
            unit: data.item.unit,
            groupId: data.item.groupId,
            groupName: data.item.groupName || '',
            description: data.item.description || '',
            dealerIds: data.item.dealerIds || [],
            dealerId: (data.item.dealerIds && data.item.dealerIds.length > 0) ? data.item.dealerIds[0] : null,
            lowStockQuantity: data.item.lowStockQuantity || 5,
            purchasePrice: data.item.purchasePrice || null,
            createdAt: data.item.createdAt,
          };

          let updatedItems;
          if (isUpdate) {
            updatedItems = items.map(i => (i.id === item.id || i.serverId === savedItem.serverId) ? savedItem : i);
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
    let updatedItems;
    if (isUpdate) {
      updatedItems = items.map(i => (i.id === item.id || (item.serverId && i.serverId === item.serverId)) ? item : i);
    } else {
      item.id = item.id || Date.now().toString();
      item.createdAt = new Date().toISOString();
      updatedItems = [...items, item];
    }

    await saveLocalData(STORAGE_KEYS.ITEMS, updatedItems);
    await addToPendingSync(isUpdate ? 'update' : 'create', 'item', item);
    console.log('Item saved locally, will sync later');

    return { success: true, item, items: updatedItems };
  } catch (error) {
    console.error('Error saving item:', error);
    return { success: false, error: error.message };
  }
};

// Delete item with offline support
export const deleteItem = async (itemId) => {
  try {
    const items = await getLocalData(STORAGE_KEYS.ITEMS) || [];
    const itemToDelete = items.find(i => i.id === itemId);
    const updatedItems = items.filter(i => i.id !== itemId);

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
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
};

// Get all items
export const getItems = async () => {
  try {
    // First try to get from local storage
    const localItems = await getLocalData(STORAGE_KEYS.ITEMS) || [];

    // Try to fetch from backend if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      const backendItems = await fetchItemsFromBackend();
      if (backendItems.length >= 0) { // Always trust backend data
        return backendItems;
      }
    }

    return localItems;
  } catch (error) {
    console.error('Error getting items:', error);
    return [];
  }
};

// Save or update a client
export const saveClient = async (client, isUpdate = false) => {
  try {
    const clientId = await getClientId();
    const clients = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
    let updatedClients;

    if (isUpdate) {
      updatedClients = clients.map(c => c.id === client.id ? client : c);
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

        // Add optional fields if present or fallback to N/A
        payload.address = client.address || 'N/A';
        payload.emailId = client.emailId || 'N/A';
        payload.gstNo = client.gstNo || 'N/A';

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
          const finalClients = updatedClients.map(c => c.id === client.id ? client : c);
          await saveLocalData(STORAGE_KEYS.CLIENTS, finalClients);
          return { success: true, client, clients: finalClients, synced: true };
        }
      } catch (error) {
        console.log('Saving to pending sync:', error.message);
      }
    }

    // If offline or sync failed, add to pending sync
    await addToPendingSync(isUpdate ? 'update' : 'create', 'client', client);

    return { success: true, client, clients: updatedClients, synced: false };
  } catch (error) {
    console.error('Error saving client:', error);
    return { success: false, error: error.message };
  }
};

// Get all clients
export const getClients = async () => {
  try {
    // First try to get from local storage
    const localClients = await getLocalData(STORAGE_KEYS.CLIENTS) || [];

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
export const saveInvoice = async (invoice, isUpdate = false) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    // DIRECT AsyncStorage read to be 100% sure
    const rawData = await AsyncStorage.getItem('@invoices');
    const invoices = rawData ? JSON.parse(rawData) : [];

    console.log(`💾 saveInvoice - Found ${invoices.length} existing invoices in storage (direct read)`);
    if (invoices.length > 0) {
      console.log(`   First 3 invoice numbers: ${invoices.slice(0, 3).map(i => i.number || i.invoiceNumber).join(', ')}`);
    }
    let updatedInvoices;

    if (isUpdate) {
      updatedInvoices = invoices.map(inv => inv.id === invoice.id ? invoice : inv);
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
    const verifyInvoices = verifyRaw ? JSON.parse(verifyRaw) : [];
    const debugCount = await AsyncStorage.getItem('@debug_invoice_count');
    console.log(`✅ Verified: ${verifyInvoices.length} invoices now in storage (debug count: ${debugCount})`);

    // Try to sync with backend immediately if online
    const netInfo3 = await NetInfo.fetch();
    if (netInfo3.isConnected && netInfo3.isInternetReachable && clientId && token) {
      try {
        // Format products array for backend
        const products = invoice.items.map(item => ({
          productId: item.serverId || item.id,
          quantity: item.quantity || 1,
        }));

        // Use the direct products route
        const invoicePayload = {
          clientId,
          clientCustomerId: invoice.clientInfo?.serverId || null, // Include if available
          clientCustomerName: invoice.clientInfo?.name || invoice.clientName || '',
          clientCustomerPhone: invoice.clientInfo?.phone || invoice.clientPhone || '',
          clientCustomerAddress: invoice.clientInfo?.address || 'N/A',
          clientCustomerEmail: invoice.clientInfo?.emailId || 'N/A',
          clientCustomerGST: invoice.clientInfo?.gstNo || 'N/A',
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
          const finalInvoices = updatedInvoices.map(inv => inv.id === invoice.id ? invoice : inv);
          await saveLocalData(STORAGE_KEYS.INVOICES, finalInvoices);
          return { success: true, invoice, invoices: finalInvoices, synced: true };
        } else {
          console.warn('Backend invoice creation failed:', data.message);
          throw new Error(data.message || 'Failed to sync');
        }
      } catch (error) {
        console.log('Failed to sync invoice to backend:', error.message);
        console.log('Adding to pending sync queue');
        await addToPendingSync(isUpdate ? 'update' : 'create', 'invoice', invoice);
      }
    } else {
      console.log('Offline - adding invoice to pending sync');
      await addToPendingSync(isUpdate ? 'update' : 'create', 'invoice', invoice);
    }

    return { success: true, invoice, invoices: updatedInvoices, synced: false };
  } catch (error) {
    console.error('Error saving invoice:', error);
    return { success: false, error: error.message };
  }
};

// Fetch clients from backend
export const fetchClientsFromBackend = async () => {
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
      const clients = data.clientCustomers.map(client => ({
        id: client._id,
        serverId: client._id,
        name: client.name,
        phone: client.phoneNumber, // Backend uses 'phoneNumber' field
        address: client.address || '',
        emailId: client.emailId || '',
        gstNo: client.gstNo || '',
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
export const deleteClient = async (clientId) => {
  try {
    const clients = await getLocalData(STORAGE_KEYS.CLIENTS) || [];
    const clientToDelete = clients.find(c => c.id === clientId);
    const updatedClients = clients.filter(c => c.id !== clientId);

    await saveLocalData(STORAGE_KEYS.CLIENTS, updatedClients);
    await addToPendingSync('delete', 'client', { id: clientId, ...clientToDelete });

    return { success: true, clients: updatedClients };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }
};

// ===== INVOICE MANAGEMENT =====

// Delete invoice with offline support
export const deleteInvoice = async (invoiceId) => {
  try {
    const invoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
    const updatedInvoices = invoices.filter(inv => inv.id !== invoiceId);

    await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);
    await addToPendingSync('delete', 'invoice', { id: invoiceId, ...invoiceToDelete });

    return { success: true, invoices: updatedInvoices };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, error: error.message };
  }
};

// Fetch invoices from backend with clientId isolation
export const fetchInvoicesFromBackend = async () => {
  try {
    const clientId = await getClientId();
    if (!clientId) return [];

    const response = await fetch(`${apiurl}/business/invoices/${clientId}`);
    const data = await response.json();

    if (data.success && data.invoices) {
      // Map backend invoices to frontend format and calculate status
      const invoices = data.invoices.map(invoice => {
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
          subtotal: invoice.subtotal || 0,
          tax: invoice.totalTax || 0,
          discount: invoice.discount || 0,
          total: totalAmount,
          grandTotal: totalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          status: status,
          notes: invoice.notes || '',
          createdAt: invoice.createdAt,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
        };
      });

      // CRITICAL: Merge with local invoices instead of replacing
      // Keep local-only invoices (ones without serverId that haven't synced yet)
      const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
      const localOnlyInvoices = localInvoices.filter(inv => !inv.serverId);

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
export const getInvoices = async () => {
  try {
    // First try to get from local storage
    const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];

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
export const getPendingInvoices = async () => {
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
    const localInvoices = rawData ? JSON.parse(rawData) : [];
    const debugCount = await AsyncStorage.getItem('@debug_invoice_count');
    console.log(`📦 Found ${localInvoices.length} invoices in local storage (direct read, last saved count: ${debugCount})`);
    if (localInvoices.length > 0) {
      console.log(`   Invoice numbers: ${localInvoices.map(i => i.number || i.invoiceNumber).join(', ')}`);
      console.log(`   Invoice IDs: ${localInvoices.slice(0, 3).map(i => i.id).join(', ')}...`);
    } else {
      console.log('   ⚠️ WARNING: INVOICES storage is EMPTY but debug count says: ' + debugCount);
    }

    let backendPendings = [];

    // If online with token, try to fetch from backend
    if (isOnline && token && clientId) {
      try {
        // CRITICAL: Sync offline payments BEFORE fetching new data
        const pendingSync = await getPendingSyncItems();
        const pendingPayments = pendingSync.filter(p => p.type === 'payment');

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

          // CRITICAL: Save backend pendings to INVOICES storage so they can be updated when payments are recorded
          const invoicesToStore = backendPendings.map(inv => ({
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
            items: (inv.products || []).map(p => ({
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
            dueDate: inv.dueDate
          }));

          // Save to INVOICES storage (merge with existing local invoices)
          const existingInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
          console.log(`🔍 BEFORE MERGE: ${existingInvoices.length} existing invoices in storage`);
          const invoiceMap = new Map();

          // Add existing LOCAL invoices WITHOUT serverId first (offline-only invoices)
          let localOnlyCount = 0;
          existingInvoices.forEach(inv => {
            if (!inv.serverId) {
              invoiceMap.set(inv.id, inv);
              localOnlyCount++;
              console.log(`   ➕ Keeping local-only invoice: ${inv.number || inv.invoiceNumber} (id: ${inv.id})`);
            }
          });

          // Add ALL backend invoices (they are source of truth for synced data)
          invoicesToStore.forEach(inv => {
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
      .filter(inv => {
        const totalAmount = parseFloat(inv.total || inv.totalAmount || inv.grandTotal || 0);
        const paidAmount = parseFloat(inv.paidAmount || 0);
        const hasPending = totalAmount > 0 && paidAmount < totalAmount;
        if (!hasPending && totalAmount > 0) {
          console.log(`⚠️ Invoice ${inv.id} filtered out: total=${totalAmount}, paid=${paidAmount}`);
        }
        return hasPending;
      })
      .map(inv => ({
        _id: inv.serverId || inv.id,
        id: inv.id,
        serverId: inv.serverId,
        invoiceNumber: inv.number || inv.invoiceNumber,
        clientCustomerName: inv.clientInfo?.name || inv.clientName || '',
        clientCustomerPhone: inv.clientInfo?.phone || inv.clientPhone || '',
        totalAmount: inv.total || inv.totalAmount || inv.grandTotal || 0,
        paidAmount: inv.paidAmount || 0,
        pendingAmount: (inv.total || inv.totalAmount || inv.grandTotal || 0) - (inv.paidAmount || 0),
        products: inv.items ? inv.items.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          costPerUnit: item.price
        })) : [],
        createdAt: inv.createdAt,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        status: inv.status
      }));

    console.log(`📦 Local invoices: ${localInvoices.length}, Local pendings: ${localPendings.length}`);
    if (localPendings.length > 0) {
      console.log('Sample local pending:', {
        id: localPendings[0].id,
        invoiceNumber: localPendings[0].invoiceNumber,
        totalAmount: localPendings[0].totalAmount,
        paidAmount: localPendings[0].paidAmount,
        pendingAmount: localPendings[0].pendingAmount
      });
    }

    // CRITICAL: When OFFLINE, return ONLY local data - no merging with stale backend cache
    if (!isOnline) {
      console.log('📴 OFFLINE MODE - Returning local pending invoices only');
      // Filter to ensure only invoices with pending amounts
      const offlinePendings = localPendings.filter(inv => {
        const pendingAmount = parseFloat(inv.pendingAmount || 0);
        return pendingAmount > 0.01;
      });
      console.log(`✅ Returning ${offlinePendings.length} offline pending invoices`);
      return offlinePendings;
    }

    // ONLINE MODE: Merge backend and local pendings
    console.log('🌐 ONLINE MODE - Merging local and backend data');
    const mergedPendings = [];
    const processedIds = new Set();

    // CRITICAL: Always prioritize local pendings first (they have the latest offline payment updates)
    localPendings.forEach(localPending => {
      const localId = localPending.serverId || localPending.id;
      const pendingAmount = parseFloat(localPending.pendingAmount || 0);

      // Only add if there's actually a pending amount
      if (pendingAmount > 0.01) {
        mergedPendings.push(localPending);
        processedIds.add(localId);
        processedIds.add(localPending.id); // Also add the local ID
      }
    });

    // Then add backend pendings that aren't already in local (and have pending amounts)
    backendPendings.forEach(backendPending => {
      const backendId = backendPending._id || backendPending.id;
      const pendingAmount = parseFloat(backendPending.pendingAmount || 0);

      if (!processedIds.has(backendId) && pendingAmount > 0.01) {
        mergedPendings.push(backendPending);
        processedIds.add(backendId);
      }
    });

    console.log(`✅ Final merged pendings: ${mergedPendings.length}`);

    // Final filter to remove any fully paid invoices
    const finalPendings = mergedPendings.filter(inv => {
      const pendingAmount = parseFloat(inv.pendingAmount || 0);
      return pendingAmount > 0.01;
    });

    return finalPendings;
  } catch (error) {
    console.error('Error in getPendingInvoices:', error);
    // Last resort - try local storage
    try {
      const localPendings = await getLocalData(STORAGE_KEYS.PENDING_INVOICES) || [];
      const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
      const localPendingInvoices = localInvoices
        .filter(inv => {
          const totalAmount = parseFloat(inv.total || inv.totalAmount || inv.grandTotal || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          return totalAmount > 0 && paidAmount < totalAmount;
        })
        .map(inv => ({
          _id: inv.serverId || inv.id,
          id: inv.id,
          invoiceNumber: inv.number || inv.invoiceNumber,
          clientCustomerName: inv.clientInfo?.name || inv.clientName || '',
          clientCustomerPhone: inv.clientInfo?.phone || inv.clientPhone || '',
          totalAmount: inv.total || inv.totalAmount || inv.grandTotal || 0,
          paidAmount: inv.paidAmount || 0,
          pendingAmount: (inv.total || inv.totalAmount || inv.grandTotal || 0) - (inv.paidAmount || 0),
          products: inv.items ? inv.items.map(item => ({
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
export const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    const invoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, status, statusUpdatedAt: new Date().toISOString() } : inv
    );

    await saveLocalData(STORAGE_KEYS.INVOICES, updatedInvoices);
    await addToPendingSync('update', 'invoice_status', { invoiceId, status });

    return { success: true, invoices: updatedInvoices };
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return { success: false, error: error.message };
  }
};

// ===== PAYMENT MANAGEMENT =====

// Record payment with offline support
export const recordPayment = async (payment) => {
  try {
    payment.id = payment.id || Date.now().toString();
    payment.recordedAt = new Date().toISOString();

    // Save payment to local storage
    const payments = await getLocalData(STORAGE_KEYS.PAYMENTS) || [];
    const updatedPayments = [...payments, payment];
    await saveLocalData(STORAGE_KEYS.PAYMENTS, updatedPayments);

    // Update local invoice paidAmount immediately
    const invoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === payment.invoiceId || inv.serverId === payment.invoiceId || inv._id === payment.invoiceId) {
        const currentPaid = parseFloat(inv.paidAmount || 0);
        const newPaidAmount = currentPaid + parseFloat(payment.amount);
        const totalAmount = parseFloat(inv.total || inv.totalAmount || inv.grandTotal || 0);
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
    const verifyInvoices = await getLocalData(STORAGE_KEYS.INVOICES);
    const verifiedInvoice = verifyInvoices?.find(inv =>
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
        const invoice = updatedInvoices.find(inv =>
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
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error: error.message };
  }
};

// Get all payments from backend
export const getPayments = async () => {
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
    const allPaymentsPromises = invoices.map(async (invoice) => {
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
        return payments.map(payment => ({
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
    const backendPayments = allPaymentsArrays.flat();

    // CRITICAL: Merge with pending (offline) payments that haven't synced yet
    const pendingSyncItems = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
    const pendingPaymentsData = pendingSyncItems.filter(item => item.type === 'payment');

    // Load local invoices to look up details for pending payments
    const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];

    const localPendingPayments = pendingPaymentsData.map(item => {
      const paymentData = item.data;

      // Find invoice details
      const invoice = localInvoices.find(inv =>
        inv.id === paymentData.invoiceId ||
        inv.serverId === paymentData.invoiceId ||
        (inv._id && inv._id === paymentData.invoiceId)
      );

      const totalAmount = parseFloat(invoice?.total || invoice?.totalAmount || invoice?.grandTotal || 0);

      return {
        id: item.id, // Use pending item ID
        invoiceId: paymentData.invoiceId,
        invoiceNumber: invoice?.number || invoice?.invoiceNumber || 'Unknown',
        clientName: invoice?.clientInfo?.name || invoice?.clientName || 'Unknown',
        clientPhone: invoice?.clientInfo?.phone || invoice?.clientPhone || '',
        amount: parseFloat(paymentData.amount),
        method: paymentData.paymentMethod || 'cash',
        note: paymentData.notes || paymentData.note || '',
        date: new Date(paymentData.recordedAt || item.timestamp).toLocaleDateString(),
        time: new Date(paymentData.recordedAt || item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: paymentData.recordedAt || item.timestamp,
        paymentType: parseFloat(paymentData.amount) >= totalAmount ? 'full' : 'partial',
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
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return allPayments;
  } catch (error) {
    console.error('Error getting payments from backend:', error);

    // OFFLINE FALLBACK: Use cached payments + pending
    try {
      console.log('📴 Offline/Error getting payments - using cached data');

      // Get cached backend payments
      const cachedPayments = await getLocalData(STORAGE_KEYS.FETCHED_PAYMENTS) || [];

      // Get pending (unsynced) payments
      const pendingSyncItems = await getLocalData(STORAGE_KEYS.PENDING_SYNC) || [];
      const pendingPaymentsData = pendingSyncItems.filter(item => item.type === 'payment');
      const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];

      const localPendingPayments = pendingPaymentsData.map(item => {
        const paymentData = item.data;
        const invoice = localInvoices.find(inv =>
          inv.id === paymentData.invoiceId ||
          inv.serverId === paymentData.invoiceId ||
          (inv._id && inv._id === paymentData.invoiceId)
        );
        const totalAmount = parseFloat(invoice?.total || invoice?.totalAmount || invoice?.grandTotal || 0);

        return {
          id: item.id,
          invoiceId: paymentData.invoiceId,
          invoiceNumber: invoice?.number || invoice?.invoiceNumber || 'Unknown',
          clientName: invoice?.clientInfo?.name || invoice?.clientName || 'Unknown',
          clientPhone: invoice?.clientInfo?.phone || invoice?.clientPhone || '',
          amount: parseFloat(paymentData.amount),
          method: paymentData.paymentMethod || 'cash',
          note: paymentData.notes || paymentData.note || '',
          date: new Date(paymentData.recordedAt || item.timestamp).toLocaleDateString(),
          time: new Date(paymentData.recordedAt || item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          createdAt: paymentData.recordedAt || item.timestamp,
          paymentType: parseFloat(paymentData.amount) >= totalAmount ? 'full' : 'partial',
          isOffline: true
        };
      });

      // Merge cached + pending
      const allPayments = [...cachedPayments, ...localPendingPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return allPayments;

    } catch (localError) {
      console.error('Error serving offline payments:', localError);
      return [];
    }
  }
};

// Get payments for specific invoice
export const getInvoicePayments = async (invoiceId) => {
  try {
    const payments = await getPayments();
    return payments.filter(p => p.invoiceId === invoiceId);
  } catch (error) {
    console.error('Error getting invoice payments:', error);
    return [];
  }
};

// ===== DRAFT MANAGEMENT =====

// Save draft with offline support
export const saveDraft = async (draft) => {
  try {
    draft.id = draft.id || Date.now().toString();
    draft.savedAt = new Date().toISOString();

    const drafts = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    const existingIndex = drafts.findIndex(d => d.id === draft.id);

    let updatedDrafts;
    if (existingIndex >= 0) {
      updatedDrafts = [...drafts];
      updatedDrafts[existingIndex] = draft;
    } else {
      updatedDrafts = [...drafts, draft];
    }

    await saveLocalData(STORAGE_KEYS.DRAFTS, updatedDrafts);

    return { success: true, draft, drafts: updatedDrafts };
  } catch (error) {
    console.error('Error saving draft:', error);
    return { success: false, error: error.message };
  }
};

// Delete draft
export const deleteDraft = async (draftId) => {
  try {
    const drafts = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    const updatedDrafts = drafts.filter(d => d.id !== draftId);

    await saveLocalData(STORAGE_KEYS.DRAFTS, updatedDrafts);

    return { success: true, drafts: updatedDrafts };
  } catch (error) {
    console.error('Error deleting draft:', error);
    return { success: false, error: error.message };
  }
};

// Get all drafts
export const getDrafts = async () => {
  try {
    return await getLocalData(STORAGE_KEYS.DRAFTS) || [];
  } catch (error) {
    console.error('Error getting drafts:', error);
    return [];
  }
};

// ===== SYNC STATUS =====

// Get pending sync count by type
export const getPendingSyncByType = async () => {
  try {
    const pending = await getPendingSyncItems();
    const byType = {
      item: 0,
      client: 0,
      invoice: 0,
      payment: 0,
      total: pending.length
    };

    pending.forEach(item => {
      if (byType[item.type] !== undefined) {
        byType[item.type]++;
      }
    });

    return byType;
  } catch (error) {
    console.error('Error getting pending sync by type:', error);
    return { item: 0, client: 0, invoice: 0, payment: 0, total: 0 };
  }
};

// Remove specific pending sync item
export const removePendingSyncItem = async (itemId) => {
  try {
    const pending = await getPendingSyncItems();
    const updated = pending.filter(item => item.id !== itemId);
    await saveLocalData(STORAGE_KEYS.PENDING_SYNC, updated);
    return true;
  } catch (error) {
    console.error('Error removing pending sync item:', error);
    return false;
  }
};

// Get draft by ID
export const getDraft = async (draftId) => {
  try {
    const drafts = await getLocalData(STORAGE_KEYS.DRAFTS) || [];
    return drafts.find(d => d.id === draftId);
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
};

// Create invoice via backend API (direct products flow - no cart)
export const createInvoiceViaBackend = async (invoiceData) => {
  try {
    const clientId = await getClientId();
    const token = await AsyncStorage.getItem('@viveha_token');

    if (!clientId || !token) {
      throw new Error('Authentication required');
    }

    // Format products array for backend with required fields
    const products = invoiceData.items.map(item => ({
      productId: item.serverId || item.id,
      quantity: item.quantity || 1,
      costPerUnit: item.price || 0,
      itemName: item.name || 'Unknown Item',
    }));

    console.log('Creating invoice with products:', products);

    // Create invoice with products directly (no cart needed)
    // Build request body with required fields
    // Use placeholder for address if empty to avoid backend validation error
    const requestBody = {
      clientId,
      clientCustomerName: invoiceData.clientInfo?.name || '',
      clientCustomerPhone: invoiceData.clientInfo?.phone || '',
      clientCustomerAddress: invoiceData.clientInfo?.address || 'N/A',
      clientCustomerEmail: invoiceData.clientInfo?.emailId || '',
      clientCustomerGST: invoiceData.clientInfo?.gstNo || '',
      invoiceNumber: invoiceData.number,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      subtotal: invoiceData.subTotal || 0,
      totalTax: invoiceData.tax || 0,
      totalDiscount: invoiceData.discount || 0,
      totalAmount: invoiceData.total || invoiceData.grandTotal,
      paidAmount: invoiceData.paidAmount || 0,
      products: products,
      notes: invoiceData.notes || ''
    }

    const invoiceResponse = await fetch(`${apiurl}/business/invoices/generatewithproducts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    const invoiceData_response = await invoiceResponse.json();
    console.log('Invoice creation response:', invoiceData_response);

    if (invoiceData_response.success) {
      return { success: true, invoice: invoiceData_response.invoice };
    } else {
      throw new Error(invoiceData_response.message || 'Failed to generate invoice');
    }
  } catch (error) {
    console.error('Error creating invoice via backend:', error);
    return { success: false, error: error.message };
  }
};

// ===== USER ISOLATION =====

// Clear all user data on logout to prevent data leakage between users
export const clearAllUserData = async () => {
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

// Fetch client profile (shop details) from backend
export const fetchClientProfile = async () => {
  try {
    const clientId = await getClientId();
    const token = await getToken();
    if (!clientId || !token) return null;

    const response = await fetch(`${apiurl}/auth/client/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success && data.client) {
      const shopDetails = {
        shopName: data.client.shopName || data.client.businessName || 'My Shop',
        location: data.client.location || '',
        city: data.client.city || '',
        state: data.client.state || '',
        ownerName: data.client.ownerName || '',
        phoneNumber: data.client.phoneNumber || ''
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
export const fetchAllUserData = async () => {
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
        invoices,
        groups,
        profile
      }
    };
  } catch (error) {
    console.error('Error fetching all user data:', error);
    return { success: false, error: error.message };
  }
};

// ===== ITEM GROUP MANAGEMENT =====

// Fetch item groups from backend
export const fetchItemGroupsFromBackend = async () => {
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
      const groups = data.itemGroups.map(g => ({
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
export const getItemGroups = async () => {
  try {
    // Try local first
    const localGroups = await getLocalData(STORAGE_KEYS.ITEM_GROUPS) || [];

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
export const createItemGroupInBackend = async (groupData) => {
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

    const tempGroup = {
      id: Date.now().toString(),
      ...groupData,
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

  } catch (error) {
    console.error('Error creating group:', error);
    const tempGroup = {
      id: Date.now().toString(),
      ...groupData,
      createdAt: new Date().toISOString()
    };
    await addToPendingSync('create', 'group', tempGroup);
    return { success: true, group: tempGroup, offline: true };
  }
};

// Update Item Group
export const updateItemGroupInBackend = async (groupId, groupData) => {
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
    const pendingCreate = pending.find(p => p.type === 'group' && p.action === 'create' && p.data.id === groupId);

    if (pendingCreate) {
      // Update the existing pending creation
      pendingCreate.data = { ...pendingCreate.data, ...groupData };
      // Update queue
      const updatedQueue = pending.map(p => p.id === pendingCreate.id ? pendingCreate : p);
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
export const deleteItemGroupInBackend = async (groupId) => {
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
    const pendingCreate = pending.find(p => p.type === 'group' && p.action === 'create' && p.data.id === groupId);

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
export const getDashboardInsights = async (months = 6, limit = 5) => {
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
// DEALER MANAGEMENT
// ============================================================================

// Storage key for dealers
STORAGE_KEYS.DEALERS = '@viveha_dealers';

// Create Dealer
export const createDealer = async (dealerData) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    const payload = {
      clientId,
      name: dealerData.businessName || dealerData.name,
      contactPerson: dealerData.contactPerson || '',
      phoneNumber: dealerData.phoneNumber || '',
      email: dealerData.emailAddress || dealerData.email || '',
      address: dealerData.officeAddress || dealerData.address || '',
      logoUrl: dealerData.logo || dealerData.logoUrl || ''
    };

    // Try online creation
    if (token) {
      try {
        const response = await fetch(`${apiurl}/dealer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success && data.dealer) {
          // Save to local storage
          const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
          const newDealer = {
            id: data.dealer._id,
            serverId: data.dealer._id,
            businessName: data.dealer.name,
            contactPerson: data.dealer.contactPerson,
            phoneNumber: data.dealer.phoneNumber,
            emailAddress: data.dealer.email,
            officeAddress: data.dealer.address,
            logo: data.dealer.logoUrl,
            createdAt: data.dealer.createdAt,
            updatedAt: data.dealer.updatedAt
          };
          dealers.push(newDealer);
          await saveLocalData(STORAGE_KEYS.DEALERS, dealers);

          return { success: true, dealer: newDealer };
        }
      } catch (networkError) {
        console.log('Network error creating dealer, saving offline:', networkError);
      }
    }

    // Offline - save locally
    const tempDealer = {
      id: Date.now().toString(),
      businessName: payload.name,
      contactPerson: payload.contactPerson,
      phoneNumber: payload.phoneNumber,
      emailAddress: payload.email,
      officeAddress: payload.address,
      logo: payload.logoUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
    dealers.push(tempDealer);
    await saveLocalData(STORAGE_KEYS.DEALERS, dealers);
    await addToPendingSync('create', 'dealer', tempDealer);

    return { success: true, dealer: tempDealer, offline: true };
  } catch (error) {
    console.error('Error creating dealer:', error);
    return { success: false, error: error.message };
  }
};

// Get Dealers
export const getDealers = async () => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId) {
      return [];
    }

    // Try fetching from backend if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable && token) {
      try {
        const response = await fetch(`${apiurl}/dealer/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success && data.dealers) {
          // Transform and save to local storage
          const dealers = data.dealers.map(dealer => ({
            id: dealer._id,
            serverId: dealer._id,
            businessName: dealer.name,
            contactPerson: dealer.contactPerson,
            phoneNumber: dealer.phoneNumber,
            emailAddress: dealer.email,
            officeAddress: dealer.address,
            logo: dealer.logoUrl,
            createdAt: dealer.createdAt,
            updatedAt: dealer.updatedAt
          }));

          await saveLocalData(STORAGE_KEYS.DEALERS, dealers);
          return dealers;
        }
      } catch (networkError) {
        console.log('Network error fetching dealers, using local data:', networkError);
      }
    }

    // Fallback to local storage
    const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
    return dealers;
  } catch (error) {
    console.error('Error getting dealers:', error);
    return [];
  }
};

// Update Dealer
export const updateDealer = async (dealerId, dealerData) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    const payload = {
      name: dealerData.businessName || dealerData.name,
      contactPerson: dealerData.contactPerson || '',
      phoneNumber: dealerData.phoneNumber || '',
      email: dealerData.emailAddress || dealerData.email || '',
      address: dealerData.officeAddress || dealerData.address || '',
      logoUrl: dealerData.logo || dealerData.logoUrl || ''
    };

    // Try online update
    if (token && dealerId.length === 24) {
      try {
        const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
          // Update local storage
          const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
          const updatedDealers = dealers.map(d =>
            d.id === dealerId ? { ...d, ...dealerData, updatedAt: new Date().toISOString() } : d
          );
          await saveLocalData(STORAGE_KEYS.DEALERS, updatedDealers);

          return { success: true };
        }
      } catch (networkError) {
        console.log('Network error updating dealer, queuing:', networkError);
      }
    }

    // Update locally and queue
    const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
    const updatedDealers = dealers.map(d =>
      d.id === dealerId ? { ...d, ...dealerData, updatedAt: new Date().toISOString() } : d
    );
    await saveLocalData(STORAGE_KEYS.DEALERS, updatedDealers);
    await addToPendingSync('update', 'dealer', { id: dealerId, serverId: dealerId.length === 24 ? dealerId : null, ...dealerData });

    return { success: true, offline: true };
  } catch (error) {
    console.error('Error updating dealer:', error);
    return { success: false, error: error.message };
  }
};

// Delete Dealer
export const deleteDealer = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    // Try online delete
    if (token && dealerId.length === 24) {
      try {
        const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success) {
          // Remove from local storage
          const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
          const updatedDealers = dealers.filter(d => d.id !== dealerId);
          await saveLocalData(STORAGE_KEYS.DEALERS, updatedDealers);

          return { success: true };
        }
      } catch (networkError) {
        console.log('Network error deleting dealer, queuing:', networkError);
      }
    }

    // Delete locally and queue
    const dealers = await getLocalData(STORAGE_KEYS.DEALERS) || [];
    const updatedDealers = dealers.filter(d => d.id !== dealerId);
    await saveLocalData(STORAGE_KEYS.DEALERS, updatedDealers);
    await addToPendingSync('delete', 'dealer', { id: dealerId, serverId: dealerId.length === 24 ? dealerId : null });

    return { success: true, offline: true };
  } catch (error) {
    console.error('Error deleting dealer:', error);
    return { success: false, error: error.message };
  }
};

// Get Dealer Items
export const getDealerItems = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) {
      console.log('getDealerItems: Missing clientId or token');
      return [];
    }

    console.log(`getDealerItems: Fetching items for dealer ${dealerId}`);
    const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    console.log(`getDealerItems response for dealer ${dealerId}:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`getDealerItems: Found ${(data.items || []).length} items for dealer ${dealerId}`);
      return data.items || [];
    }
    console.log(`getDealerItems: Request failed for dealer ${dealerId}`);
    return [];
  } catch (error) {
    console.error('Error fetching dealer items:', error);
    return [];
  }
};

// Get Dealer Low Stock Items
export const getDealerLowStockItems = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) return [];

    const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}/items/low-stock`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.success) {
      return data.items || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
};

// Create Dealer Order
export const createDealerOrder = async (orderData) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId) throw new Error('Client ID not found');
    if (!token) throw new Error('Please login to create orders');

    const payload = {
      clientId,
      dealerId: orderData.dealerId,
      items: orderData.items.map(item => ({
        itemId: item.itemId || item._id || item.serverId || item.id,
        quantity: item.quantity
      })),
      notes: orderData.notes || '',
      deliveryInstructions: orderData.deliveryInstructions || '',
      isUrgent: orderData.isUrgent || false,
      totalAmount: orderData.totalAmount || null,
      dueDate: orderData.dueDate || null
    };

    console.log('Creating dealer order with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${apiurl}/dealer/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('Dealer order response:', data);
    
    if (data.success) {
      return { success: true, order: data.order };
    } else {
      throw new Error(data.message || data.error || 'Failed to create order');
    }
  } catch (error) {
    console.error('Error creating dealer order:', error);
    return { success: false, error: error.message };
  }
};

// Get Dealer Orders
export const getDealerOrders = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) return [];

    const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.orders || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching dealer orders:', error);
    return [];
  }
};

// Get Dealer Order by ID with items
export const getDealerOrderById = async (orderId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) throw new Error('Not authenticated');

    const response = await fetch(`${apiurl}/dealer/orders/${orderId}?clientId=${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, order: data.order, items: data.items };
    }
    throw new Error(data.error || 'Failed to fetch order');
  } catch (error) {
    console.error('Error fetching order details:', error);
    return { success: false, error: error.message };
  }
};

// Mark Dealer Order as Delivered (increments stock automatically)
export const markDealerOrderDelivered = async (orderId, deliveryData) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) throw new Error('Not authenticated');

    const payload = {
      clientId,
      deliveredBy: deliveryData?.deliveredBy || '',
      deliveryNote: deliveryData?.deliveryNote || '',
      totalAmount: deliveryData?.totalAmount || null,
      dueDate: deliveryData?.dueDate || null
    };

    const response = await fetch(`${apiurl}/dealer/orders/${orderId}/mark-delivered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, order: data.order };
    }
    throw new Error(data.error || 'Failed to mark order as delivered');
  } catch (error) {
    console.error('Error marking order delivered:', error);
    return { success: false, error: error.message };
  }
};

// Get Dealer Summary (total ordered, paid, payable)
export const getDealerSummary = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) return null;

    const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.summary;
    }
    return null;
  } catch (error) {
    console.error('Error fetching dealer summary:', error);
    return null;
  }
};

// Get Dealer Payments
export const getDealerPayments = async (dealerId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) return [];

    const response = await fetch(`${apiurl}/dealer/${clientId}/${dealerId}/payments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.payments || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching dealer payments:', error);
    return [];
  }
};

// Get Order Payments (payments for specific order)
export const getOrderPayments = async (orderId) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) return null;

    const response = await fetch(`${apiurl}/dealer/orders/${orderId}/payments?clientId=${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { 
        success: true, 
        order: data.order, 
        payments: data.payments, 
        summary: data.summary 
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching order payments:', error);
    return null;
  }
};

// Create Dealer Payment
export const createDealerPayment = async (paymentData) => {
  try {
    const clientId = await getClientId();
    const token = await getToken();

    if (!clientId || !token) throw new Error('Not authenticated');

    const payload = {
      clientId,
      dealerId: paymentData.dealerId,
      orderId: paymentData.orderId || null,
      amount: parseFloat(paymentData.amount),
      method: paymentData.method || 'cash',
      note: paymentData.note || '',
      proofUrl: paymentData.proofUrl || '',
      paidAt: paymentData.paidAt || new Date().toISOString()
    };

    const response = await fetch(`${apiurl}/dealer/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, payment: data.payment };
    }
    throw new Error(data.error || 'Failed to record payment');
  } catch (error) {
    console.error('Error creating dealer payment:', error);
    return { success: false, error: error.message };
  }
};

