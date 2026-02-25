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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiurl from '../api';

interface SettingsScreenProps {
  navigation: any;
}

interface CustomerFields {
  address: boolean;
  emailId: boolean;
  gstNo: boolean;
}

interface TaxSettings {
  enableTaxCalculation: boolean;
  primaryTaxRate: number;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [customerFields, setCustomerFields] = useState<CustomerFields>({
    address: false,
    emailId: false,
    gstNo: false,
  });
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    enableTaxCalculation: false,
    primaryTaxRate: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (): Promise<void> => {
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
        const taxConfig = data.client.clientSettings?.taxSettings || {
          enableTaxCalculation: false,
          primaryTaxRate: 0,
        };
        console.log('⚙️ Settings loaded:', settings);
        console.log('💰 Tax settings loaded:', taxConfig);
        setCustomerFields(settings);
        setTaxSettings(taxConfig);
        
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('@viveha_customer_field_settings', JSON.stringify(settings));
        await AsyncStorage.setItem('@viveha_tax_settings', JSON.stringify(taxConfig));
      } else {
        throw new Error(data.message || 'Failed to fetch settings');
      }
    } catch (error: any) {
      console.error('❌ Error fetching settings:', error);
      console.error('Error details:', error.message);
      
      // Try to load from AsyncStorage if API fails
      try {
        const cachedSettings = await AsyncStorage.getItem('@viveha_customer_field_settings');
        const cachedTaxSettings = await AsyncStorage.getItem('@viveha_tax_settings');
        if (cachedSettings) {
          console.log('📂 Loaded cached settings');
          setCustomerFields(JSON.parse(cachedSettings));
          if (cachedTaxSettings) {
            setTaxSettings(JSON.parse(cachedTaxSettings));
          }
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
      } catch (cacheError: any) {
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

  const updateSetting = async (field: string, value: boolean | number, isTaxSetting: boolean = false): Promise<void> => {
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
      let updatedFields: CustomerFields, updatedTaxSettings: TaxSettings, payload: any;
      if (isTaxSetting) {
        updatedTaxSettings = { ...taxSettings, [field]: value };
        setTaxSettings(updatedTaxSettings);
        payload = {
          clientSettings: {
            taxSettings: {
              [field]: value,
            },
          },
        };
      } else {
        updatedFields = { ...customerFields, [field]: value };
        setCustomerFields(updatedFields);
        payload = {
          clientSettings: {
            customerFields: {
              [field]: value,
            },
          },
        };
      }

      const url = `${apiurl}/auth/client/${clientId}`;

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
        if (isTaxSetting) {
          const newTaxSettings = data.client.clientSettings?.taxSettings || updatedTaxSettings;
          setTaxSettings(newTaxSettings);
          await AsyncStorage.setItem('@viveha_tax_settings', JSON.stringify(newTaxSettings));
        } else {
          const newSettings = data.client.clientSettings?.customerFields || updatedFields;
          setCustomerFields(newSettings);
          await AsyncStorage.setItem('@viveha_customer_field_settings', JSON.stringify(newSettings));
        }

        console.log('✅ Setting updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Updated',
          text2: isTaxSetting 
            ? `${getFieldLabel(field, true)} updated` 
            : `${getFieldLabel(field)} ${value ? 'enabled' : 'disabled'}`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        // Revert on failure
        if (isTaxSetting) {
          setTaxSettings(taxSettings);
        } else {
          setCustomerFields(customerFields);
        }
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('❌ Error updating setting:', error);
      console.error('Error details:', error.message);
      // Revert on failure
      if (isTaxSetting) {
        setTaxSettings(taxSettings);
      } else {
        setCustomerFields(customerFields);
      }
      
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

  const getFieldLabel = (field: string, isTaxField: boolean = false): string => {
    if (isTaxField) {
      const taxLabels: { [key: string]: string } = {
        enableTaxCalculation: 'Tax Calculation',
        primaryTaxRate: 'Primary Tax Rate',
      };
      return taxLabels[field] || field;
    }
    const labels: { [key: string]: string } = {
      address: 'Address',
      emailId: 'Email ID',
      gstNo: 'GST Number',
    };
    return labels[field] || field;
  };

  const getFieldDescription = (field: string): string => {
    const descriptions: { [key: string]: string } = {
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
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

        {/* Tax Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tax Settings</Text>
            <Text style={styles.sectionDescription}>
              Configure automatic tax calculation for all invoices
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E88E99" />
              <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Enable Tax Calculation */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Enable Tax Calculation</Text>
                  <Text style={styles.settingDescription}>
                    Apply tax to all invoices
                  </Text>
                </View>
                <Switch
                  value={taxSettings.enableTaxCalculation}
                  onValueChange={(value) => updateSetting('enableTaxCalculation', value, true)}
                  trackColor={{ false: '#D1D5DB', true: '#E88E99' }}
                  thumbColor={taxSettings.enableTaxCalculation ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              {/* Primary Tax Rate - Only shown when tax calculation is enabled */}
              {taxSettings.enableTaxCalculation && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingLabel}>Primary tax (GST/VAT)%</Text>
                    </View>
                    <View style={styles.taxInputContainer}>
                      <TextInput
                        style={styles.taxInput}
                        value={String(taxSettings.primaryTaxRate)}
                        onChangeText={(text) => {
                          const numValue = parseFloat(text) || 0;
                          if (numValue >= 0 && numValue <= 100) {
                            updateSetting('primaryTaxRate', numValue, true);
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        maxLength={5}
                        editable={!updating}
                      />
                      <Text style={styles.percentSymbol}>%</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name={"information-circle" as any} size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                When you enable a field, it will be shown when adding or editing customer information. 
                Disabled fields will not be collected from customers.
              </Text>
            </View>
          </View>
        </View>

        {/* Developer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Developer Options</Text>
            <Text style={styles.sectionDescription}>
              Testing and debugging tools
            </Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={async () => {
                Alert.alert(
                  'Reset to First-Time User',
                  'This will log you out and reset onboarding. The app will show onboarding screens as if you\'re opening it for the first time. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset & Logout',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // Clear onboarding flag
                          await AsyncStorage.removeItem('hasSeenOnboarding');
                          // Clear login tokens to simulate first-time user
                          await AsyncStorage.removeItem('@viveha_token');
                          await AsyncStorage.removeItem('@viveha_client_id');
                          
                          Toast.show({
                            type: 'success',
                            text1: 'Reset Complete',
                            text2: 'Restarting app...',
                          });
                          
                          // Navigate to logo screen (first-time user experience)
                          setTimeout(() => {
                            navigation.reset({
                              index: 0,
                              routes: [{ name: 'Logo' }],
                            });
                          }, 500);
                        } catch (error) {
                          console.error('Error resetting onboarding:', error);
                          Alert.alert('Error', 'Failed to reset onboarding');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Test First-Time Experience</Text>
                <Text style={styles.settingDescription}>
                  Reset onboarding and logout to see first-time user flow
                </Text>
              </View>
              <Ionicons name={"refresh" as any} size={24} color="#FF9800" />
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
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
  taxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  taxInput: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  percentSymbol: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
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
