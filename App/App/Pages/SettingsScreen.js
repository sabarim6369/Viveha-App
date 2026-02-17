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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiurl from '../api';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [customerFields, setCustomerFields] = useState({
    address: false,
    emailId: false,
    gstNo: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');

      console.log('📱 Fetching settings for clientId:', clientId);
      console.log('🔑 Token available:', !!token);

      if (!token || !clientId) {
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Logo');
        return;
      }

      const url = `${apiurl}/auth/client/${clientId}`;
      console.log('🌐 Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success && data.client) {
        const settings = data.client.clientSettings?.customerFields || {
          address: false,
          emailId: false,
          gstNo: false,
        };
        console.log('⚙️ Settings loaded:', settings);
        setCustomerFields(settings);
        
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('@viveha_customer_field_settings', JSON.stringify(settings));
      } else {
        throw new Error(data.message || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      console.error('Error details:', error.message);
      
      // Try to load from AsyncStorage if API fails
      try {
        const cachedSettings = await AsyncStorage.getItem('@viveha_customer_field_settings');
        if (cachedSettings) {
          console.log('📂 Loaded cached settings');
          setCustomerFields(JSON.parse(cachedSettings));
          Toast.show({
            type: 'info',
            text1: 'Using Cached Settings',
            text2: 'Could not connect to server',
            position: 'bottom',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message || 'Failed to load settings',
            position: 'bottom',
          });
        }
      } catch (cacheError) {
        console.error('❌ Cache error:', cacheError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load settings',
          position: 'bottom',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field, value) => {
    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');

      console.log('🔄 Updating setting:', field, '=', value);

      if (!token || !clientId) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Optimistic update
      const updatedFields = { ...customerFields, [field]: value };
      setCustomerFields(updatedFields);

      const url = `${apiurl}/auth/client/${clientId}`;
      const payload = {
        clientSettings: {
          customerFields: {
            [field]: value,
          },
        },
      };

      console.log('🌐 Updating at:', url);
      console.log('📦 Payload:', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📊 Update response status:', response.status);
      const data = await response.json();
      console.log('📦 Update response data:', data);

      if (data.success && data.client) {
        const newSettings = data.client.clientSettings?.customerFields || updatedFields;
        setCustomerFields(newSettings);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('@viveha_customer_field_settings', JSON.stringify(newSettings));

        console.log('✅ Setting updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Updated',
          text2: `${getFieldLabel(field)} ${value ? 'enabled' : 'disabled'}`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        // Revert on failure
        setCustomerFields(customerFields);
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('❌ Error updating setting:', error);
      console.error('Error details:', error.message);
      // Revert on failure
      setCustomerFields(customerFields);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update setting',
        position: 'bottom',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      address: 'Address',
      emailId: 'Email ID',
      gstNo: 'GST Number',
    };
    return labels[field] || field;
  };

  const getFieldDescription = (field) => {
    const descriptions = {
      address: 'Collect customer address for deliveries and billing',
      emailId: 'Collect customer email for digital invoices',
      gstNo: 'Collect GST number for B2B transactions',
    };
    return descriptions[field] || '';
  };

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
        {/* Customer Fields Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Edit Client–Customer Input Fields</Text>
            <Text style={styles.sectionDescription}>
              Control which fields are visible while adding or or editing clients
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E88E99" />
              <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Address Field */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Address</Text>
                  <Text style={styles.settingDescription}>
                    {getFieldDescription('address')}
                  </Text>
                </View>
                <Switch
                  value={customerFields.address}
                  onValueChange={(value) => updateSetting('address', value)}
                  trackColor={{ false: '#D1D5DB', true: '#E88E99' }}
                  thumbColor={customerFields.address ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              <View style={styles.divider} />

              {/* Email ID Field */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Email ID</Text>
                  <Text style={styles.settingDescription}>
                    {getFieldDescription('emailId')}
                  </Text>
                </View>
                <Switch
                  value={customerFields.emailId}
                  onValueChange={(value) => updateSetting('emailId', value)}
                  trackColor={{ false: '#D1D5DB', true: '#E88E99' }}
                  thumbColor={customerFields.emailId ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              <View style={styles.divider} />

              {/* GST Number Field */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>GST Number</Text>
                  <Text style={styles.settingDescription}>
                    {getFieldDescription('gstNo')}
                  </Text>
                </View>
                <Switch
                  value={customerFields.gstNo}
                  onValueChange={(value) => updateSetting('gstNo', value)}
                  trackColor={{ false: '#D1D5DB', true: '#E88E99' }}
                  thumbColor={customerFields.gstNo ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                When you enable a field, it will be shown when adding or editing customer information. 
                Disabled fields will not be collected from customers.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 20,
  },
  infoSection: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
});
