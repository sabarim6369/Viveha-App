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
} from 'react-native';
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
  const [cardRetailSuffix, setCardRetailSuffix] = useState('Retailers Pvt');
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
  const generatedQrPreviewUrl = upiId.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${upiId.trim()}&pn=Viveha&cu=INR`)}`
    : '';

  useEffect(() => {
    const loadPaymentSettings = async (): Promise<void> => {
      try {
        const cachedSettings = await AsyncStorage.getItem(paymentSettingsKey);
        if (cachedSettings) {
          const parsed: PaymentSettings = JSON.parse(cachedSettings);
          setUpiId(parsed.upiId || '@viveha.retail@okaxis');
          setBankName(parsed.bankName || 'Viveha Bank');
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

          setUpiId(remoteSettings.upiId || '@viveha.retail@okaxis');
          setBankName(remoteSettings.bankName || 'Viveha Bank');
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setQrImageUri(result.assets[0].uri);
    }
  };

  const handleSaveChanges = async (): Promise<void> => {
    try {
      setSaving(true);
      const paymentSettings: PaymentSettings = {
        upiId,
        bankName,
        accountNumber,
        ifscCode,
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
        upiId,
        bankName,
        accountNumber,
        ifscCode,
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
    } catch (e) {
      console.error('Error saving payment settings', e);
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
                <Text style={styles.bankName}>VIVEHA</Text>
                <Switch
                  value={bankCardEnabled}
                  onValueChange={setBankCardEnabled}
                  trackColor={{ false: '#D1D1D6', true: '#FFFFFF' }}
                  thumbColor={bankCardEnabled ? '#FFFFFF' : '#F4F3F4'}
                  ios_backgroundColor="#3e3e3e"
                  style={styles.cardSwitch}
                />
              </View>
              <View style={styles.cardDetails}>
                <View>
                  <Text style={styles.cardHolder}>Viveha {cardRetailSuffix}</Text>
                  <Text style={styles.cardLocation}>{cardCity}</Text>
                </View>
                <Ionicons name="wifi" size={40} color="#FFFFFF" style={styles.contactlessIcon} />
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
          <Text style={styles.sectionTitle}>UPI & QR Setup</Text>
          <View style={styles.qrUploadContainer}>
            <View style={styles.uploadBox}>
              {generatedQrPreviewUrl ? (
                <>
                  <Image source={{ uri: generatedQrPreviewUrl }} style={styles.qrPreview as any} resizeMode="contain" />
                  <Text style={styles.uploadText}>QR generated from your UPI ID</Text>
                  <Text style={styles.uploadSubtext}>Each invoice will create its own QR with that invoice amount already filled in.</Text>
                </>
              ) : qrImageUri ? (
                <>
                  <Image source={{ uri: qrImageUri }} style={styles.qrPreview as any} resizeMode="contain" />
                  <Text style={styles.uploadText}>Fallback QR image selected</Text>
                  <Text style={styles.uploadSubtext}>This will only be used if no UPI ID is available.</Text>
                </>
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={40} color="#CCC" />
                  <Text style={styles.uploadText}>Enter a UPI ID to generate QR</Text>
                  <Text style={styles.uploadSubtext}>Invoice QR codes will auto-fill the payable amount for each invoice.</Text>
                </>
              )}
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.upiHeaderRow}>
                <Text style={styles.inputLabel}>UPI ID</Text>
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
                <TouchableOpacity style={styles.optionalQrButton} activeOpacity={0.8} onPress={handlePickQrImage}>
                  <Ionicons name="image-outline" size={18} color="#666" />
                  <Text style={styles.optionalQrButtonText}>{qrImageUri ? 'Replace fallback QR image' : 'Upload fallback QR image'}</Text>
                </TouchableOpacity>
                <Text style={styles.optionalQrHint}>Fallback QR is optional. When UPI ID is set, invoice QR will be generated automatically with the invoice amount.</Text>
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
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
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

            <Text style={styles.modalHint}>“Viveha” is fixed and cannot be edited.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Retail name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Retailers Pvt"
                placeholderTextColor="#999"
                value={cardRetailSuffix}
                onChangeText={setCardRetailSuffix}
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
    marginBottom: 20,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  contactlessIcon: {
    transform: [{ rotate: '90deg' }],
    opacity: 0.9,
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
