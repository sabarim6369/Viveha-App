import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiurl from '../api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [tempTaxRate, setTempTaxRate] = useState<string>('0');
  const [isTaxRateModified, setIsTaxRateModified] = useState<boolean>(false);
  
  // Temporary states for tracking unsaved changes
  const [tempCustomerFields, setTempCustomerFields] = useState<CustomerFields>({
    address: false,
    emailId: false,
    gstNo: false,
  });
  const [tempTaxSettings, setTempTaxSettings] = useState<TaxSettings>({
    enableTaxCalculation: false,
    primaryTaxRate: 0,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

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
        setTempTaxRate(String(taxConfig.primaryTaxRate || 0));
        
        // Initialize temporary states
        setTempCustomerFields(settings);
        setTempTaxSettings(taxConfig);
        setHasUnsavedChanges(false);
        
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
            const taxConfig = JSON.parse(cachedTaxSettings);
            setTaxSettings(taxConfig);
            setTempTaxRate(String(taxConfig.primaryTaxRate || 0));
          }
          
          // Initialize temporary states with cached values
          const settings = JSON.parse(cachedSettings);
          setTempCustomerFields(settings);
          if (cachedTaxSettings) {
            const taxConfig = JSON.parse(cachedTaxSettings);
            setTempTaxSettings(taxConfig);
          }
          setHasUnsavedChanges(false);
          
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

  const updateLocalSetting = (field: string, value: boolean, isTaxSetting: boolean = false): void => {
    if (isTaxSetting) {
      const newTempTaxSettings = { ...tempTaxSettings, [field]: value };
      setTempTaxSettings(newTempTaxSettings);
    } else {
      const newTempCustomerFields = { ...tempCustomerFields, [field]: value };
      setTempCustomerFields(newTempCustomerFields);
    }
    setHasUnsavedChanges(true);
  };

  const updateLocalTaxRate = (text: string): void => {
    // Allow empty string or valid decimal numbers
    if (text === '' || /^\d*\.?\d*$/.test(text)) {
      const numValue = parseFloat(text) || 0;
      if (numValue <= 100) {
        setTempTaxRate(text);
        const newTempTaxSettings = { ...tempTaxSettings, primaryTaxRate: numValue };
        setTempTaxSettings(newTempTaxSettings);
        setHasUnsavedChanges(true);
      }
    }
  };

  const saveAllChanges = async (): Promise<void> => {
    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');

      console.log('💾 Saving all changes...');

      if (!token || !clientId) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Prepare payload with all changes
      const payload: any = {
        clientSettings: {
          customerFields: tempCustomerFields,
          taxSettings: tempTaxSettings,
        },
      };

      const url = `${apiurl}/auth/client/${clientId}`;

      console.log('🌐 Saving at:', url);
      console.log('📦 Payload:', JSON.stringify(payload));

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📊 Save response status:', response.status);
      const data = await response.json();
      console.log('📦 Save response data:', data);

      if (data.success && data.client) {
        // Update the actual states with saved values
        const newSettings = data.client.clientSettings?.customerFields || tempCustomerFields;
        const newTaxSettings = data.client.clientSettings?.taxSettings || tempTaxSettings;
        
        setCustomerFields(newSettings);
        setTaxSettings(newTaxSettings);
        
        // Update temporary states to match saved states
        setTempCustomerFields(newSettings);
        setTempTaxSettings(newTaxSettings);
        setTempTaxRate(String(newTaxSettings.primaryTaxRate || 0));
        setHasUnsavedChanges(false);

        // Save to AsyncStorage
        await AsyncStorage.setItem('@viveha_customer_field_settings', JSON.stringify(newSettings));
        await AsyncStorage.setItem('@viveha_tax_settings', JSON.stringify(newTaxSettings));

        console.log('✅ All settings saved successfully');
        Toast.show({
          type: 'success',
          text1: 'Settings Saved',
          text2: 'All changes have been saved successfully',
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      console.error('Error details:', error.message);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to save settings',
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          keyboardDismissMode="on-drag"
        >
        <View style={styles.settingsPanel}>
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
                  <View style={styles.iconLabelContainer}>
                    <Ionicons name="location-outline" size={16} color="#666" style={styles.settingIcon} />
                    <Text style={styles.settingLabel}>Address</Text>
                  </View>
                </View>
                <Switch
                  value={tempCustomerFields.address}
                  onValueChange={(value) => updateLocalSetting('address', value)}
                  trackColor={{ false: '#D1D5DB', true: '#F98648' }}
                  thumbColor={tempCustomerFields.address ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              <View style={styles.divider} />

              {/* Email ID Field */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconLabelContainer}>
                    <Ionicons name="mail-outline" size={16} color="#666" style={styles.settingIcon} />
                    <Text style={styles.settingLabel}>Email ID</Text>
                  </View>
                </View>
                <Switch
                  value={tempCustomerFields.emailId}
                  onValueChange={(value) => updateLocalSetting('emailId', value)}
                  trackColor={{ false: '#D1D5DB', true: '#F98648' }}
                  thumbColor={tempCustomerFields.emailId ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              <View style={styles.divider} />

              {/* GST Number Field */}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconLabelContainer}>
                    <Ionicons name="document-text-outline" size={16} color="#666" style={styles.settingIcon} />
                    <Text style={styles.settingLabel}>GST Number</Text>
                  </View>
                </View>
                <Switch
                  value={tempCustomerFields.gstNo}
                  onValueChange={(value) => updateLocalSetting('gstNo', value)}
                  trackColor={{ false: '#D1D5DB', true: '#F98648' }}
                  thumbColor={tempCustomerFields.gstNo ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionBreak} />

        {/* Tax Settings Section */}
        <View style={styles.section}>
          

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
                  <Text style={styles.settingLabel1}>Enable Tax Calculation</Text>
                  <Text style={styles.settingDescription}>
                    Apply tax to all invoices.
                  </Text>
                </View>
                <Switch
                  value={tempTaxSettings.enableTaxCalculation}
                  onValueChange={(value) => updateLocalSetting('enableTaxCalculation', value, true)}
                  trackColor={{ false: '#D1D5DB', true: '#F98648' }}
                  thumbColor={tempTaxSettings.enableTaxCalculation ? '#fff' : '#fff'}
                  disabled={updating}
                />
              </View>

              <View style={styles.divider} />

              {/* Primary Tax Rate - full width under header */}
              <View style={styles.settingColumn}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Primary tax (GST/VAT)%</Text>
                </View>
                <View style={styles.taxInputWrapper}>
                  <View style={styles.taxInputContainer}>
                    <TextInput
                      style={styles.taxInput}
                      value={tempTaxRate}
                      onChangeText={updateLocalTaxRate}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      maxLength={5}
                      editable={!updating}
                      onFocus={() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
        </View>

        {/* Save Changes Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveChangesButton, updating && styles.saveChangesButtonDisabled]}
            onPress={saveAllChanges}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name={"save-outline" as any} size={20} color="#fff" />
                <Text style={styles.saveChangesButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Clear Data Section - Commented for now */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>App Data</Text>
            <Text style={styles.sectionDescription}>
              Reset app to initial state (for testing/debugging)
            </Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.clearDataButton}
              onPress={() => {
                Alert.alert(
                  'Clear All Data?',
                  'This will log you out and reset the app to initial state. You will need to login again.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear Data',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // Clear all app data
                          await AsyncStorage.clear();
                          Toast.show({
                            type: 'success',
                            text1: 'Data Cleared',
                            text2: 'App has been reset',
                            position: 'bottom',
                          });
                          // Navigate to first onboarding screen
                          navigation.reset({
                            index: 0,
                            routes: [{ name: 'Logo' }],
                          });
                        } catch (error: any) {
                          Toast.show({
                            type: 'error',
                            text1: 'Error',
                            text2: error.message || 'Failed to clear data',
                            position: 'bottom',
                          });
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.clearDataLeft}>
                <Ionicons name="refresh-outline" size={24} color="#F44336" />
                <View style={styles.clearDataTextContainer}>
                  <Text style={styles.clearDataLabel}>Clear All Data</Text>
                  <Text style={styles.clearDataDescription}>
                    Reset app and return to onboarding
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View> */}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Footer bar */}
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
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
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
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  settingsPanel: {
    marginTop: 4,
    marginBottom: 4,
  },
  section: {
    marginTop: 6,
    marginBottom: 8,
    marginHorizontal: 6,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
  },
  card: {
    backgroundColor: 'transparent',
  },
  sectionBreak: {
    height: 4,
    backgroundColor: 'transparent',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  iconLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    // marginTop:4

  },
  settingLabel1:{
 fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    marginTop:9
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginLeft: 20,
  },
  taxInputWrapper: {
    paddingTop: 8,
  },
  taxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 2,
    minWidth: 100,
    width: '100%',
  },
  taxInput: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    minWidth: 50,
    flex: 1,
    textAlign: 'left',
  },
  percentSymbol: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  infoSection: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  settingColumn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  saveTaxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E88E99',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
    shadowColor: '#E88E99',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveTaxButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  saveTaxButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  saveChangesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F98648',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    gap: 8,
    shadowColor: '#F98648',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveChangesButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveChangesButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // clearDataButton: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingHorizontal: 20,
  //   paddingVertical: 16,
  // },
  // clearDataLeft: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   flex: 1,
  // },
  // clearDataTextContainer: {
  //   marginLeft: 12,
  //   flex: 1,
  // },
  // clearDataLabel: {
  //   fontSize: 16,
  //   fontWeight: '500',
  //   color: '#F44336',
  //   marginBottom: 4,
  // },
  // clearDataDescription: {
  //   fontSize: 13,
  //   color: '#999',
  //   lineHeight: 18,
  // },
});
