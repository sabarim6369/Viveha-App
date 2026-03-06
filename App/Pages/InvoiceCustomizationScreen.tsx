import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_URL from '../api';

interface InvoiceCustomizationScreenProps {
  navigation: any;
}

interface InvoiceSettings {
  layoutStyle: 'Classic' | 'Modern' | 'Compact';
  showBrandLogo: boolean;
  showGSTUIN: boolean;
  showQRCode: boolean;
  headerColor: string;
}

const COLOR_OPTIONS = [
  { color: '#5B8DEF' },
  { color: '#FF8A50' },
  { color: '#8B5CF6' },
  { color: '#F43F5E' },
];

export default function InvoiceCustomizationScreen({ navigation }: InvoiceCustomizationScreenProps): React.JSX.Element {
  const [settings, setSettings] = useState<InvoiceSettings>({
    layoutStyle: 'Modern',
    showBrandLogo: true,
    showGSTUIN: true,
    showQRCode: false,
    headerColor: '#5B8DEF'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      // Load from AsyncStorage first
      const savedSettings = await AsyncStorage.getItem('@viveha_invoice_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      
      // Optionally fetch from backend
      const clientId = await AsyncStorage.getItem('@viveha_client_id');
      const token = await AsyncStorage.getItem('@viveha_token');
      
      if (clientId && token) {
        try {
          const response = await axios.get(`${API_URL}/auth/client/${clientId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success && response.data.client.clientSettings?.invoiceSettings) {
            const backendSettings = response.data.client.clientSettings.invoiceSettings;
            setSettings(backendSettings);
            await AsyncStorage.setItem('@viveha_invoice_settings', JSON.stringify(backendSettings));
          }
        } catch (error) {
          console.log('Could not fetch settings from backend:', error);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    setSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('@viveha_invoice_settings', JSON.stringify(settings));
      
      // Save to backend
      const clientId = await AsyncStorage.getItem('@viveha_client_id');
      const token = await AsyncStorage.getItem('@viveha_token');
      
      if (clientId && token) {
        try {
          await axios.put(
            `${API_URL}/auth/client/${clientId}`,
            {
              clientSettings: {
                invoiceSettings: settings
              }
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          Alert.alert('Success', 'Invoice customization saved successfully!');
        } catch (error: any) {
          console.error('Error saving to backend:', error);
          Alert.alert('Saved Locally', 'Settings saved on your device. Will sync when online.');
        }
      } else {
        Alert.alert('Success', 'Invoice customization saved!');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]): void => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Invoice Customization</Text>
          <Text style={styles.headerSubtitle}>Real-Time Preview</Text>
        </View>

        {/* Invoice Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.brandSection}>
              <Image 
                source={require('../assets/logo2.png')} 
                style={styles.brandIcon}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>viveha.ai</Text>
            </View>
            
            <View style={styles.clientSection}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>isaii.ai</Text>
                <Text style={styles.clientStoreId}>Client Store ID</Text>
                <Text style={styles.clientPhone}>9003872804</Text>
              </View>
              <View style={styles.clientAvatar}>
                <Image 
                  source={require('../assets/logo2.png')} 
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Invoice Content */}
          <View style={styles.invoiceContent}>
            {/* Customer & Invoice Info */}
            <View style={styles.invoiceInfoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Customer Name</Text>
                <Text style={styles.infoValue}>John Doe</Text>
              </View>
              <View style={styles.infoColRight}>
                <Text style={styles.infoLabel}>Invoice No:</Text>
                <Text style={styles.infoValue}>INV001</Text>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>06/03/2026</Text>
              </View>
            </View>

            {/* Items Table */}
            <View style={styles.itemsTable}>
              <View style={[styles.tableHeader, { backgroundColor: settings.headerColor }]}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>Item</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Rate</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Amount</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>Product Name</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>2</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>₹500</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>₹1,000</Text>
              </View>
              
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 3 }]}>Another Product lorem ipsum</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>1</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>₹750</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>₹750</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>Service charges</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>1</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>₹200</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>₹200</Text>
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sub Total</Text>
                <Text style={styles.totalValue}>₹1,950</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total Amount</Text>
                <Text style={styles.totalValue}>₹1,950</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text style={styles.totalValue}>₹0</Text>
              </View>
              <View style={[styles.totalRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={[styles.balanceValue, { color: settings.headerColor }]}>₹1,950</Text>
              </View>
            </View>

            {/* Footer with QR */}
            {settings.showQRCode && (
              <View style={styles.invoiceFooter}>
                <View style={styles.qrSection}>
                  <Ionicons name="qr-code" size={60} color="#333" />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Layout Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Layout Style</Text>
          <View style={styles.layoutOptions}>
            {(['Classic', 'Modern', 'Compact'] as const).map((layout) => (
              <TouchableOpacity 
                key={layout}
                style={[
                  styles.layoutButton, 
                  settings.layoutStyle === layout && styles.layoutButtonActive
                ]}
                onPress={() => updateSetting('layoutStyle', layout)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.layoutText, 
                  settings.layoutStyle === layout && styles.layoutTextActive
                ]}>
                  {layout}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toggle Options */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="image-outline" size={20} color="#666" />
              </View>
              <Text style={styles.toggleLabel}>Show Brand Logo</Text>
            </View>
            <Switch
              value={settings.showBrandLogo}
              onValueChange={(value) => updateSetting('showBrandLogo', value)}
              trackColor={{ false: '#E0E0E0', true: '#FFB8A0' }}
              thumbColor={settings.showBrandLogo ? '#FF6B35' : '#f4f3f4'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="receipt-outline" size={20} color="#666" />
              </View>
              <Text style={styles.toggleLabel}>Show GST/UIN</Text>
            </View>
            <Switch
              value={settings.showGSTUIN}
              onValueChange={(value) => updateSetting('showGSTUIN', value)}
              trackColor={{ false: '#E0E0E0', true: '#FFB8A0' }}
              thumbColor={settings.showGSTUIN ? '#FF6B35' : '#f4f3f4'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="qr-code-outline" size={20} color="#666" />
              </View>
              <Text style={styles.toggleLabel}>Show QR Code</Text>
            </View>
            <Switch
              value={settings.showQRCode}
              onValueChange={(value) => updateSetting('showQRCode', value)}
              trackColor={{ false: '#E0E0E0', true: '#FFB8A0' }}
              thumbColor={settings.showQRCode ? '#FF6B35' : '#f4f3f4'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View>

        {/* Color Palette */}
        <View style={styles.colorSection}>
          {COLOR_OPTIONS.map((item) => (
            <TouchableOpacity 
              key={item.color}
              style={[
                styles.colorDot, 
                { backgroundColor: item.color },
                settings.headerColor === item.color && styles.colorDotActive
              ]}
              onPress={() => updateSetting('headerColor', item.color)}
              activeOpacity={0.7}
            />
          ))}
          <TouchableOpacity style={styles.editColorBtn}>
            <Ionicons name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, saving && styles.nextButtonDisabled]}
          onPress={saveSettings}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footerBrand}>viveha.ai</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '400',
  },
  previewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandIcon: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientInfo: {
    alignItems: 'flex-end',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  clientStoreId: {
    fontSize: 9,
    color: '#999',
    marginBottom: 1,
  },
  clientPhone: {
    fontSize: 10,
    color: '#666',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  invoiceContent: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
  },
  invoiceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCol: {
    flex: 1,
  },
  infoColRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  itemsTable: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  tableRowAlt: {
    backgroundColor: '#F8F9FA',
  },
  tableCell: {
    fontSize: 9,
    color: '#333',
  },
  totalsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  balanceRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  qrSection: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  layoutOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  layoutButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  layoutButtonActive: {
    borderColor: '#5B8DEF',
    backgroundColor: '#EBF3FF',
  },
  layoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  layoutTextActive: {
    color: '#5B8DEF',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  colorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  colorDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowOpacity: 0.25,
    elevation: 6,
  },
  editColorBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#FF8A50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: '#FF8A50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  footerBrand: {
    fontSize: 11,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
});
