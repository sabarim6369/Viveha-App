/**
 * Clear Cache Script
 * 
 * This script clears all cached data from AsyncStorage 
 * while preserving authentication tokens.
 * 
 * Run this in your app by importing and calling clearCachedData()
 * from NetworkManager, or use this standalone script.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ITEMS: '@viveha_items',
  CLIENTS: '@viveha_clients',
  INVOICES: '@viveha_invoices',
  PAYMENTS: '@viveha_payments',
  DRAFTS: '@viveha_drafts',
  PENDING_SYNC: '@viveha_pending_sync',
  LAST_SYNC: '@viveha_last_sync',
  ITEM_GROUPS: '@viveha_item_groups',
  PENDING_INVOICES: '@viveha_pending_invoices',
  FETCHED_PAYMENTS: '@viveha_fetched_payments',
};

export const clearAllCache = async () => {
  try {
    console.log('🧹 Clearing ALL cached data...');
    
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

    // Show what's being cleared
    console.log(`Clearing ${keys.length} storage keys...`);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        console.log(`  - ${key}: ${value.length} bytes`);
      }
    }

    await AsyncStorage.multiRemove(keys);
    
    console.log('✅ All cached data cleared successfully!');
    console.log('📝 Authentication tokens and user data preserved');
    
    return { success: true, clearedCount: keys.length };
  } catch (error) {
    console.error('❌ Error clearing cached data:', error);
    return { success: false, error: error.message };
  }
};

// If running as a script
if (require.main === module) {
  clearAllCache().then(result => {
    console.log('Result:', result);
  });
}

export default clearAllCache;
