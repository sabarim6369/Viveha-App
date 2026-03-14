import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Footer from '../Components/Footer';
import {
  useNetworkStatus,
  saveLocalData,
  getLocalData,
  addToPendingSync,
  STORAGE_KEYS,
} from '../utils/NetworkManager';
import apiurl from '../api';

export default function SettingsScreen({ navigation }) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [customerFields, setCustomerFields] = useState({
    address: false,
    emailId: false,
    gstNo: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // First try to load from local storage
      const localSettings = await getLocalData(STORAGE_KEYS.USER_SETTINGS);
      
      if (localSettings && localSettings.customerFields) {
        setCustomerFields(localSettings.customerFields);
      }

      // If online, fetch from backend to get latest
      if (isConnected && isInternetReachable) {
        const clientId = await AsyncStorage.getItem('@viveha_client_id');
        const token = await AsyncStorage.getItem('@viveha_token');

        if (clientId && token) {
        const url = `${apiurl}/client/${clientId}`;
        console.log('📍 Fetching settings from URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.client && data.client.clientSettings) {
              const fields = data.client.clientSettings.customerFields || {};
              setCustomerFields(fields);
              
              // Save to local storage
              await saveLocalData(STORAGE_KEYS.USER_SETTINGS, {
                customerFields: fields,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load settings',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleField = async (fieldName) => {
    try {
      const newValue = !customerFields[fieldName];
      const updatedFields = {
        ...customerFields,
        [fieldName]: newValue,
      };

      // Update local state immediately
      setCustomerFields(updatedFields);

      // Save to local storage immediately
      await saveLocalData(STORAGE_KEYS.USER_SETTINGS, {
        customerFields: updatedFields,
        lastSyncedAt: new Date().toISOString(),
      });

      // Try to sync with backend
      if (isConnected && isInternetReachable) {
        await syncSettingsToBackend(updatedFields);
      } else {
        // Add to pending sync queue
        await addToPendingSync('update', 'settings', {
          customerFields: updatedFields,
        });

        Toast.show({
          type: 'info',
          text1: 'Saved Offline',
          text2: 'Settings will sync when you\'re back online',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save settings',
        position: 'bottom',
      });
    }
  };

  const syncSettingsToBackend = async (fields) => {
    try {
      setSaving(true);
      const clientId = await AsyncStorage.getItem('@viveha_client_id');
      const token = await AsyncStorage.getItem('@viveha_token');

      if (!clientId || !token) {
        console.log('⚠️ No authentication found, skipping backend sync');
        return;
      }

      const url = `${apiurl}/client/${clientId}`;
      console.log('⚙️ Syncing settings to backend:', fields);
      console.log('📍 URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientSettings: {
            customerFields: fields,
          },
        }),
      });

      const data = await response.json();
      console.log('📡 Settings sync response:', data);

      if (!response.ok) {
        console.error('❌ Settings sync failed with status:', response.status);
        console.error('Response:', data);
        throw new Error(data.message || 'Failed to update settings on server');
      }
      
      if (data.success) {
        // Update local storage with confirmed data
        await saveLocalData(STORAGE_KEYS.USER_SETTINGS, {
          customerFields: fields,
          lastSyncedAt: new Date().toISOString(),
        });

        console.log('✅ Settings synced successfully');

        Toast.show({
          type: 'success',
          text1: 'Settings Saved',
          text2: 'Your preferences have been updated',
          position: 'bottom',
        });
      } else {
        console.error('❌ Settings sync returned success=false:', data.message);
      }
    } catch (error) {
      console.error('❌ Error syncing settings:', error);
      // Don't show error to user since it's already saved locally
      // Settings will sync later via NetworkManager when online
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E88E99" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Customer Fields Settings Card */}
        <View style={styles.settingsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Edit Client—Customer Input Fields</Text>
            <Text style={styles.cardDescription}>
              Control which fields are visible while adding or editing clients
            </Text>
          </View>

          {/* Address Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Address</Text>
            <Switch
              trackColor={{ false: '#D1D1D6', true: '#E88E99' }}
              thumbColor={customerFields.address ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#D1D1D6"
              onValueChange={() => handleToggleField('address')}
              value={customerFields.address}
              disabled={saving}
            />
          </View>

          <View style={styles.divider} />

          {/* Email ID Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Email ID</Text>
            <Switch
              trackColor={{ false: '#D1D1D6', true: '#E88E99' }}
              thumbColor={customerFields.emailId ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#D1D1D6"
              onValueChange={() => handleToggleField('emailId')}
              value={customerFields.emailId}
              disabled={saving}
            />
          </View>

          <View style={styles.divider} />

          {/* GST Number Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>GST Number</Text>
            <Switch
              trackColor={{ false: '#D1D1D6', true: '#E88E99' }}
              thumbColor={customerFields.gstNo ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#D1D1D6"
              onValueChange={() => handleToggleField('gstNo')}
              value={customerFields.gstNo}
              disabled={saving}
            />
          </View>
        </View>

        {/* Sync Status */}
        {!isConnected && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FF9800" />
            <Text style={styles.offlineText}>
              Changes saved offline. Will sync when connected.
            </Text>
          </View>
        )}

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#E88E99" />
            <Text style={styles.savingText}>Syncing...</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Footer */}
      <Footer activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 10,
  },
  savingText: {
    fontSize: 13,
    color: '#666',
  },
  bottomSpacing: {
    height: 100,
  },
});
