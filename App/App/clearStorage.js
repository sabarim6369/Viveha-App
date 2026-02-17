// Run this script to clear all AsyncStorage data
// Usage: node clearStorage.js

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearAllStorage() {
  try {
    console.log('🧹 Clearing all AsyncStorage data...');
    
    // List of all storage keys used in the app
    const keysToDelete = [
      '@invoices',
      '@viveha_items',
      '@viveha_clients',
      '@viveha_invoices',
      '@pending_sync',
      '@viveha_pending_sync',
      '@business_info',
      '@viveha_payments',
      '@viveha_drafts',
      '@last_sync',
      '@viveha_last_sync',
      '@sync_status',
      '@viveha_pending_invoices',
      '@viveha_item_groups',
      '@viveha_fetched_payments',
      '@debug_invoice_count',
      '@viveha_token',
      '@viveha_client_id',
      '@viveha_user_data',
      '@viveha_cart',
      '@viveha_payment_history',
      '@viveha_shop_details',
      '@viveha_pendings'
    ];
    
    // Clear all keys
    await AsyncStorage.multiRemove(keysToDelete);
    
    console.log('✅ All offline storage cleared successfully!');
    console.log(`   Removed ${keysToDelete.length} storage keys`);
    console.log('⚠️  You will need to login again');
    
    // Verify it's cleared
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`\n📊 Remaining keys: ${allKeys.length}`);
    if (allKeys.length > 0) {
      console.log('   Keys:', allKeys);
    }
    
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
}

clearAllStorage();
