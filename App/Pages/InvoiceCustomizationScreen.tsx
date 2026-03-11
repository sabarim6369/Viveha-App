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
  route?: {
    params?: {
      isRegistration?: boolean;
      [key: string]: any;
    };
  };
}

interface InvoiceSettings {
  layoutStyle: 'Classic' | 'Modern' | 'Compact';
  showBrandLogo: boolean;
  showGSTUIN: boolean;
  showQRCode: boolean;
  headerColor: string;
}

interface ShopDetails {
  shopName?: string;
  profileImage?: string;
  location?: string;
  state?: string;
  mobile?: string;
  phoneNumber?: string;
  city?: string;
  gstin?: string;
}

const COLOR_OPTIONS = [
  { color: '#5B8DEF' },
  { color: '#FF8A50' },
  { color: '#8B5CF6' },
  { color: '#F43F5E' },
];

export default function InvoiceCustomizationScreen({ navigation, route }: InvoiceCustomizationScreenProps): React.JSX.Element {
  const isRegistration = route?.params?.isRegistration || false;
  const [settings, setSettings] = useState<InvoiceSettings>({
    layoutStyle: 'Modern',
    showBrandLogo: true,
    showGSTUIN: true,
    showQRCode: false,
    headerColor: '#5B8DEF'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [shopDetails, setShopDetails] = useState<ShopDetails>({
    shopName: route?.params?.shopName || '',
    profileImage: route?.params?.profileImage || '',
  });

  const previewItems = [
    { name: 'Product Name', quantity: 2, price: 500, tax: 18 },
    { name: 'Another Product', quantity: 1, price: 750, tax: 18 },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const savedShopDetails = await AsyncStorage.getItem('@viveha_shop_details');
      if (savedShopDetails) {
        const parsedShopDetails = JSON.parse(savedShopDetails);
        setShopDetails({
          shopName: parsedShopDetails.shopName || route?.params?.shopName || '',
          profileImage: parsedShopDetails.profileImage || route?.params?.profileImage || '',
          location: parsedShopDetails.location || '',
          state: parsedShopDetails.state || '',
          mobile: parsedShopDetails.mobile || '',
          phoneNumber: parsedShopDetails.phoneNumber || '',
          city: parsedShopDetails.city || '',
          gstin: parsedShopDetails.gstin || '',
        });
      }

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
      
      // Navigate to Success page if in registration flow, otherwise go back
      if (isRegistration) {
        navigation.navigate('Success', { ...route?.params, isRegistration: true });
      } else {
        navigation.goBack();
      }
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

  const previewSubTotal = previewItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const previewTax = previewItems.reduce((sum, item) => sum + ((item.price * item.quantity * item.tax) / 100), 0);
  const previewTotal = previewSubTotal + previewTax;
  const previewTaxableAmount = previewSubTotal;
  const previewSgst = previewTax / 2;
  const previewCgst = previewTax / 2;
  const previewSenderLines = [
    [shopDetails.location, shopDetails.city, shopDetails.state].filter(Boolean).join(', '),
    shopDetails.phoneNumber || shopDetails.mobile ? `Phone: ${shopDetails.phoneNumber || shopDetails.mobile}` : '',
    settings.showGSTUIN && shopDetails.gstin ? `GST: ${shopDetails.gstin}` : '',
  ].filter(Boolean);

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

      <View style={styles.registrationHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#999" />
        </TouchableOpacity>

        {isRegistration ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              navigation.navigate('Success', { ...route?.params, isRegistration: true });
            }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            {isRegistration ? 'Customize Your Invoices' : 'Invoice Customization'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isRegistration ? 'Choose how your invoices will look' : 'Real-Time Preview'}
          </Text>
        </View>

        {/* Invoice Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewPaper}>
            <View style={styles.previewPaperHeader}>
              <View style={styles.previewBrandWrap}>
                {settings.showBrandLogo ? (
                  <View style={styles.previewBrandSection}>
                    {shopDetails.profileImage ? (
                      <Image
                        source={{ uri: shopDetails.profileImage }}
                        style={styles.previewBrandIcon}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require('../assets/logo2.png')}
                        style={styles.previewBrandIcon}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.previewBrandName}>{shopDetails.shopName || 'viveha.ai'}</Text>
                  </View>
                ) : (
                  <Text style={styles.previewBrandName}>{shopDetails.shopName || 'viveha.ai'}</Text>
                )}
              </View>
              <View style={styles.previewPoweredByContainer}>
                <Text style={styles.previewPoweredLabel}>Powered by</Text>
                <Text style={styles.previewPoweredName}>isaii.ai</Text>
                <Text style={styles.previewPoweredId}>9003557604</Text>
              </View>

              <View style={styles.previewBadgeWrap}>
                <Image 
                  source={require('../assets/Home3.png')} 
                  style={styles.previewBadge}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.previewMetaRow}>
              <View style={styles.previewSenderSection}>
                <Text style={styles.previewSenderName}>{shopDetails.shopName || 'Studio Den'}</Text>
                {previewSenderLines.length > 0 && (
                  <Text style={styles.previewSenderAddress}>{previewSenderLines.join('\n')}</Text>
                )}
              </View>

              <View style={styles.previewInvoiceMetaSection}>
                <Text style={[styles.previewMetaLabel, { color: settings.headerColor }]}>Service Details:</Text>
                <View style={styles.previewMetaPair}>
                  <Text style={styles.previewSubLabel}>Invoice #:</Text>
                  <Text style={styles.previewSubValue}>INV001</Text>
                </View>
                <View style={styles.previewMetaPair}>
                  <Text style={styles.previewSubLabel}>Invoice Date:</Text>
                  <Text style={styles.previewSubValue}>06/03/2026</Text>
                </View>
                <View style={styles.previewMetaPair}>
                  <Text style={styles.previewSubLabel}>Due Date:</Text>
                  <Text style={styles.previewSubValue}>21/03/2026</Text>
                </View>
              </View>
            </View>

            <View style={styles.previewTable}>
              <View style={[styles.previewTableHeader, { backgroundColor: settings.headerColor }]}>
                <Text style={[styles.previewTh, styles.previewColDesc]}>Item/Service</Text>
                <Text style={[styles.previewTh, styles.previewColBrief, styles.previewCenterText]}>Qty</Text>
                <Text style={[styles.previewTh, styles.previewColBrief, styles.previewCenterText]}>GST</Text>
                <Text style={[styles.previewTh, styles.previewColAmount, styles.previewRightText]}>Amount</Text>
              </View>

              {previewItems.map((item, index) => {
                const lineSubtotal = item.price * item.quantity;
                const lineTax = (lineSubtotal * item.tax) / 100;
                const lineTotal = lineSubtotal + lineTax;

                return (
                  <View key={item.name} style={[styles.previewTableRow, index % 2 !== 0 && styles.previewRowAlt]}>
                    <Text style={[styles.previewTd, styles.previewColDesc]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.previewTd, styles.previewColBrief, styles.previewCenterText]}>{item.quantity}</Text>
                    <Text style={[styles.previewTd, styles.previewColBrief, styles.previewCenterText]}>{item.tax}%</Text>
                    <Text style={[styles.previewTd, styles.previewColAmount, styles.previewRightText]}>₹{lineTotal.toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.previewDivider} />

            <View style={styles.previewSummarySection}>
              <View style={styles.previewSummaryLeft}>
                <Text style={styles.previewSummaryLabel}>Country of supply: <Text style={styles.previewNormalText}>India</Text></Text>
                <Text style={styles.previewSummaryLabel}>Place of supply: <Text style={styles.previewNormalText}>{shopDetails.city || 'Bangalore'}</Text></Text>
                <Text style={[styles.previewSummaryLabel, styles.previewWordsHeading]}>Invoice Total In Words:</Text>
                <Text style={[styles.previewWordsText, { color: settings.headerColor }]}>Two Thousand Three Hundred One Rupees Only</Text>
              </View>

              <View style={styles.previewSummaryRight}>
                <View style={styles.previewSumRow}>
                  <Text style={styles.previewSumLabel}>Sub Total</Text>
                  <Text style={styles.previewSumValue}>₹{previewSubTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.previewSumRow}>
                  <Text style={styles.previewSumLabel}>Taxable Amount</Text>
                  <Text style={styles.previewSumValue}>₹{previewTaxableAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.previewSumRow}>
                  <Text style={styles.previewSumLabel}>SGST</Text>
                  <Text style={styles.previewSumValue}>₹{previewSgst.toFixed(2)}</Text>
                </View>
                <View style={styles.previewSumRow}>
                  <Text style={styles.previewSumLabel}>CGST</Text>
                  <Text style={styles.previewSumValue}>₹{previewCgst.toFixed(2)}</Text>
                </View>
                <View style={styles.previewTotalDueRow}>
                  <Text style={styles.previewTotalDueLabel}>Total Due</Text>
                  <Text style={[styles.previewTotalDueValue, { color: settings.headerColor }]}>₹{previewTotal.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.previewFooterSection}>
              <View style={styles.previewTermsCol}>
                <Text style={styles.previewFooterTitle}>Terms and Conditions</Text>
                <Text style={styles.previewLegalText} numberOfLines={2}>
                  Please pay within 15 days from the invoice date. Quote invoice number when remitting funds.
                </Text>
              </View>

              {(settings.showQRCode || settings.showGSTUIN) && (
                <View style={styles.previewBankCol}>
                  <Text style={styles.previewFooterTitle}>Payment Details</Text>
                  {settings.showGSTUIN && (
                    <View style={styles.previewBankRow}>
                      <Text style={styles.previewLbl}>GST:</Text>
                      <Text style={styles.previewVal}>{shopDetails.gstin || '29ABCDE1234F1Z5'}</Text>
                    </View>
                  )}
                  {settings.showQRCode && (
                    <View style={styles.previewQrWrap}>
                      <Ionicons name="qr-code" size={28} color="#333" />
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

      
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Layout Style</Text>
          <View style={styles.layoutOptions}>
            {(['Classic', 'Modern', 'Compact'] as const).map((layout) => (
              (() => {
                const isLocked = layout !== 'Modern';
                const isActive = settings.layoutStyle === layout;

                return (
              <TouchableOpacity 
                key={layout}
                style={[
                  styles.layoutButton, 
                  isActive && styles.layoutButtonActive,
                  isLocked && styles.layoutButtonLocked
                ]}
                onPress={() => {
                  if (!isLocked) {
                    updateSetting('layoutStyle', layout);
                  }
                }}
                activeOpacity={0.7}
                disabled={isLocked}
              >
                <View style={styles.layoutButtonContent}>
                  <Text style={[
                    styles.layoutText, 
                    isActive && styles.layoutTextActive,
                    isLocked && styles.layoutTextLocked
                  ]}>
                    {layout}
                  </Text>
                  {isLocked && <Ionicons name="lock-closed" size={14} color="#999" />}
                </View>
              </TouchableOpacity>
                );
              })()
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
              style={styles.colorDotWrapper}
              onPress={() => updateSetting('headerColor', item.color)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.colorDot, 
                  { backgroundColor: item.color },
                  settings.headerColor === item.color && styles.colorDotActive
                ]}
              >
                {settings.headerColor === item.color && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
              <Text style={styles.nextButtonText}>{isRegistration ? 'Continue' : 'Next'}</Text>
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
  registrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  backButton: {
    padding: 4,
  },
  skipButton: {
    padding: 4,
  },
  skipPlaceholder: {
    width: 40,
  },
  skipText: {
    fontSize: 15,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  previewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 10,
    maxHeight: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  previewPaper: {
    backgroundColor: '#fff',
  },
  previewPaperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewBrandWrap: {
    flex: 1.2,
    paddingRight: 8,
  },
  previewBrandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBrandIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  previewBrandName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
  },
  previewPoweredByContainer: {
    flex: 1,
    alignItems: 'center',
  },
  previewPoweredLabel: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  previewPoweredName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  previewPoweredId: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  previewBadgeWrap: {
    width: 30,
    alignItems: 'flex-end',
  },
  previewBadge: {
    width: 28,
    height: 28,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  previewSenderSection: {
    flex: 0.42,
    paddingRight: 8,
  },
  previewSenderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111',
    marginBottom: 3,
  },
  previewSenderAddress: {
    fontSize: 7,
    color: '#4B5563',
    lineHeight: 10,
  },
  previewInvoiceMetaSection: {
    flex: 0.58,
    alignItems: 'flex-start',
  },
  previewMetaLabel: {
    fontSize: 7,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewMetaPair: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  previewSubLabel: {
    fontSize: 7,
    color: '#6B7280',
    minWidth: 44,
  },
  previewSubValue: {
    fontSize: 7,
    fontWeight: '600',
    color: '#111',
    textAlign: 'left',
  },
  previewTable: {
    marginBottom: 10,
  },
  previewTableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginBottom: 1,
  },
  previewTh: {
    fontSize: 7,
    fontWeight: '700',
    color: '#fff',
  },
  previewTableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 5,
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  previewRowAlt: {
    backgroundColor: '#F8F9FA',
  },
  previewTd: {
    fontSize: 7,
    color: '#333',
  },
  previewColDesc: {
    flex: 2.5,
  },
  previewColBrief: {
    flex: 0.7,
  },
  previewColAmount: {
    flex: 1.2,
  },
  previewCenterText: {
    textAlign: 'center',
  },
  previewRightText: {
    textAlign: 'right',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  previewSummarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewSummaryLeft: {
    flex: 1,
    paddingRight: 10,
  },
  previewSummaryLabel: {
    fontSize: 7,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 2,
  },
  previewNormalText: {
    fontWeight: '400',
    color: '#111',
  },
  previewWordsHeading: {
    marginTop: 5,
  },
  previewWordsText: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 11,
  },
  previewSummaryRight: {
    width: 112,
  },
  previewSumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  previewSumLabel: {
    fontSize: 7,
    color: '#6B7280',
  },
  previewSumValue: {
    fontSize: 7,
    fontWeight: '600',
    color: '#111',
  },
  previewTotalDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewTotalDueLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#111',
  },
  previewTotalDueValue: {
    fontSize: 9,
    fontWeight: '700',
  },
  previewFooterSection: {
    flexDirection: 'row',
    gap: 8,
  },
  previewTermsCol: {
    flex: 1,
  },
  previewBankCol: {
    width: 92,
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 6,
  },
  previewFooterTitle: {
    fontSize: 7,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  previewLegalText: {
    fontSize: 6,
    color: '#6B7280',
    lineHeight: 9,
  },
  previewBankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 4,
  },
  previewLbl: {
    fontSize: 6,
    color: '#6B7280',
  },
  previewVal: {
    flex: 1,
    fontSize: 6,
    fontWeight: '600',
    color: '#111',
    textAlign: 'right',
  },
  previewQrWrap: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
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
  layoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  layoutButtonActive: {
    borderColor: '#5B8DEF',
    backgroundColor: '#EBF3FF',
  },
  layoutButtonLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
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
  layoutTextLocked: {
    color: '#999',
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
  colorDotWrapper: {
    padding: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#333',
    shadowOpacity: 0.3,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  checkmarkContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 24,
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
