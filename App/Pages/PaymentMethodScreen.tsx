import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiurl from '../api';

interface PaymentMethodScreenProps {
  navigation: any;
}

interface PaymentSettings {
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentQrUrl?: string;
}

export default function PaymentMethodScreen({ navigation }: PaymentMethodScreenProps): React.JSX.Element {
  const paymentSettingsKey = '@viveha_payment_settings';
  const [bankCardEnabled, setBankCardEnabled] = useState(true);
  const [upiId, setUpiId] = useState('@viveha.retail@okaxis');

  // Editable card fields (Viveha prefix is fixed in UI)
  const [cardRetailName, setCardRetailName] = useState('Viveha Retailers Pvt');
  const [cardCity, setCardCity] = useState('Coimbatore');
  const [cardBusinessName, setCardBusinessName] = useState('JAYAKUMAR JK TRADERS');
  const [cardLast4, setCardLast4] = useState('0930');
  const [cardDate, setCardDate] = useState('23/01');

  // Bank account details at bottom
  const [bankName, setBankName] = useState('Viveha Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [qrImageUri, setQrImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(false);

  useEffect(() => {
    const loadPaymentSettings = async (): Promise<void> => {
      try {
        const cachedSettings = await AsyncStorage.getItem(paymentSettingsKey);
        if (cachedSettings) {
          const parsed: PaymentSettings = JSON.parse(cachedSettings);
          setUpiId(parsed.upiId || '');
          setBankName(parsed.bankName || '');
          setAccountNumber(parsed.accountNumber || '');
          setIfscCode(parsed.ifscCode || '');
          setQrImageUri(parsed.paymentQrUrl || null);
        }

        const token = await AsyncStorage.getItem('@viveha_token');
        const clientId = await AsyncStorage.getItem('@viveha_client_id');
        if (!token || !clientId) {
          return;
        }

        const response = await fetch(`${apiurl}/auth/client/${clientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok && data.success && data.client) {
          const remoteSettings: PaymentSettings = {
            upiId: data.client.upiId || '',
            bankName: data.client.bankName || '',
            accountNumber: data.client.accountNumber || '',
            ifscCode: data.client.ifscCode || '',
            paymentQrUrl: data.client.paymentQrUrl || '',
          };

          setUpiId(remoteSettings.upiId || '');
          setBankName(remoteSettings.bankName || '');
          setAccountNumber(remoteSettings.accountNumber || '');
          setIfscCode(remoteSettings.ifscCode || '');
          setQrImageUri(remoteSettings.paymentQrUrl || null);
          await AsyncStorage.setItem(paymentSettingsKey, JSON.stringify(remoteSettings));
        }
      } catch (error) {
        console.error('Error loading payment settings', error);
      }
    };

    loadPaymentSettings();
  }, []);

  const handlePickQrImage = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Media library permission not granted');
      return;
    }

    // Force black background and light icons for high contrast in native editor
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#000000', true);
      StatusBar.setBarStyle('light-content', true);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    // Reset back to original style (white background, dark icons)
    if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#ffffff', true);
        StatusBar.setBarStyle('dark-content', true);
    }

    if (!result.canceled) {
      setQrImageUri(result.assets[0].uri);
    }
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      setSaving(true);
      const paymentSettings: PaymentSettings = {
        upiId: upiId.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        paymentQrUrl: qrImageUri || undefined,
      };
      await AsyncStorage.setItem(paymentSettingsKey, JSON.stringify(paymentSettings));

      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');

      if (!token || !clientId) {
        console.warn('No auth token/clientId found');
        return;
      }

      let paymentQrUrl: string | undefined;

      if (qrImageUri) {
        const formData: any = new FormData();
        formData.append(
          'profileImage',
          // Cast to any to satisfy React Native FormData typing
          {
            uri: qrImageUri,
            name: 'qr.png',
            type: 'image/png',
          } as any,
        );

        const uploadResponse = await fetch(`${apiurl}/upload/profile-picture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData as any,
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.success && uploadData.profileUrl) {
          paymentQrUrl = uploadData.profileUrl;
        }
      }

      const payload: any = {
        upiId: upiId.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
      };
      if (paymentQrUrl) {
        payload.paymentQrUrl = paymentQrUrl;
        paymentSettings.paymentQrUrl = paymentQrUrl;
      }

      await AsyncStorage.setItem(paymentSettingsKey, JSON.stringify(paymentSettings));

      await fetch(`${apiurl}/auth/client/${clientId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Payment settings updated successfully',
        position: 'bottom',
      });
    } catch (e) {
      console.error('Error saving payment settings', e);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save payment settings',
        position: 'bottom',
      });
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>Payment Method</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditingCard(true)}
        >
          <Ionicons name="create-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 70}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bank Card */}
          <View style={styles.cardContainer}>
          <View style={styles.bankCard}>
            {/* Card Top Section */}
            <View style={styles.cardTop}>
              <View style={styles.cardHeader}>
                <Text style={styles.bankName}>{cardRetailName.split(' ')[0].toUpperCase()}</Text>
                <View style={styles.logoGroup}>
                  <View style={styles.circle1} />
                  <View style={styles.circle2} />
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.holderInfo}>
                  <Text style={styles.cardHolder}>{cardRetailName}</Text>
                  <Text style={styles.cardLocation}>{cardCity}</Text>
                </View>
                <Ionicons name="wifi" size={32} color="#FFFFFF" style={styles.contactlessIcon} />
              </View>
            </View>

            {/* Card Bottom Section */}
            <View style={styles.cardBottom}>
              <View style={styles.cardBottomContent}>
                <View>
                  <Text style={styles.cardDate}>{cardDate}</Text>
                  <Text style={styles.cardName}>{cardBusinessName}</Text>
                </View>
                <Text style={styles.cardNumber}>···· ···· ···· {cardLast4}</Text>
              </View>
            </View>
          </View>
          </View>

          {/* UPI & QR Setup */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment QR Code</Text>
            <View style={styles.qrUploadContainer}>
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={handlePickQrImage}
                activeOpacity={0.8}
              >
                {qrImageUri ? (
                  <>
                    <Image source={{ uri: qrImageUri }} style={styles.qrPreview as any} resizeMode="contain" />
                    <Text style={styles.uploadText}>Tap to change QR image</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={40} color="#FF8A5B" />
                    <Text style={styles.uploadText}>Upload your Payment QR</Text>
                    <Text style={styles.uploadSubtext}>This QR will be shown on all your invoices</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <View style={styles.upiHeaderRow}>
                  <Text style={styles.inputLabel}>UPI ID (for display)</Text>
                  <TouchableOpacity
                    style={styles.upiEditButton}
                    onPress={() => setIsEditingUpi(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#FF8A5B" />
                    <Text style={styles.upiEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, !isEditingUpi && styles.readonlyInput]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="e.g. viveha.retail@okaxis"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={isEditingUpi}
                />
                {isEditingUpi && (
                  <View style={styles.upiActionsRow}>
                    <TouchableOpacity
                      style={styles.upiSaveButton}
                      onPress={async () => {
                        await handleSaveChanges();
                        setIsEditingUpi(false);
                      }}
                      disabled={saving}
                    >
                      <Text style={styles.upiSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.upiCancelButton}
                      onPress={() => setIsEditingUpi(false)}
                    >
                      <Text style={styles.upiCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Bank Account Details */}
          <View style={styles.bankDetailsCard}>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
            <Text style={styles.sectionSubtitle}>
              Add the account where you receive UPI and card settlements.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. HDFC Bank"
                placeholderTextColor="#999"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter account number"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IFSC code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. HDFC0001234"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                value={ifscCode}
                onChangeText={setIfscCode}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Footer activeTab="Profile" navigation={navigation} />

      {/* Edit card modal */}
      <Modal
        visible={isEditingCard}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingCard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit card details</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsEditingCard(false)}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Retail name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Retail Name"
                placeholderTextColor="#999"
                value={cardRetailName}
                onChangeText={setCardRetailName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.textInput}
                placeholder="City"
                placeholderTextColor="#999"
                value={cardCity}
                onChangeText={setCardCity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business name (bottom)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Business name on card"
                placeholderTextColor="#999"
                value={cardBusinessName}
                onChangeText={setCardBusinessName}
              />
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <Text style={styles.inputLabel}>Expiry / Date</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="23/01"
                  placeholderTextColor="#999"
                  value={cardDate}
                  onChangeText={setCardDate}
                />
              </View>
              <View style={styles.twoColumnItem}>
                <Text style={styles.inputLabel}>Last 4 digits</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0930"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={cardLast4}
                  onChangeText={setCardLast4}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setIsEditingCard(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 29,
  },
  editButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bankCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTop: {
    backgroundColor: '#4A6FFF',
    padding: 20,
    paddingBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle1: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
  circle2: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginLeft: -12,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  holderInfo: {
    flex: 1,
  },
  cardHolder: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  contactlessIcon: {
    transform: [{ rotate: '90deg' }],
    opacity: 0.9,
    marginBottom: 5,
  },
  cardBottom: {
    backgroundColor: '#000000',
    padding: 20,
  },
  cardBottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  qrUploadContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 140,
    justifyContent: 'center',
  },
  qrPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 5,
  },
  optionalQrButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
  },
  optionalQrButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  optionalQrHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: '#888',
    textAlign: 'center',
  },
  upiIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  upiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  upiInput: {
    flex: 1,
    fontSize: 14,
    color: '#6B4FFF',
    fontWeight: '500',
  },
  bankDetailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
  readonlyInput: {
    backgroundColor: '#F3F3F3',
  },
  upiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  upiEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upiEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8A5B',
  },
  upiActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  upiSaveButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FF8A5B',
  },
  upiSaveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  upiCancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
  },
  upiCancelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8A5B',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#FF8A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalHint: {
    fontSize: 12,
    color: '#777',
    marginBottom: 10,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  twoColumnItem: {
    flex: 1,
  },
  modalSaveButton: {
    marginTop: 14,
    backgroundColor: '#FF8A5B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
