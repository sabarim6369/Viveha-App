import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';

interface PaymentMethodScreenProps {
  navigation: any;
}

export default function PaymentMethodScreen({ navigation }: PaymentMethodScreenProps): React.JSX.Element {
  const [bankCardEnabled, setBankCardEnabled] = useState(true);
  const [cashPaymentsEnabled, setCashPaymentsEnabled] = useState(false);
  const [cardPaymentsEnabled, setCardPaymentsEnabled] = useState(false);
  const [upiId, setUpiId] = useState('@viveha.retail@okaxis');

  const handleSaveChanges = () => {
    // Save payment method changes
    console.log('Payment method changes saved');
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
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Bank Card */}
        <View style={styles.cardContainer}>
          <View style={styles.bankCard}>
            {/* Card Top Section */}
            <View style={styles.cardTop}>
              <View style={styles.cardHeader}>
                <Text style={styles.bankName}>VIVEHA BANK</Text>
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
                  <Text style={styles.cardHolder}>Viveha Retailers Pvt</Text>
                  <Text style={styles.cardLocation}>Coimbatore</Text>
                </View>
                <Ionicons name="wifi" size={40} color="#FFFFFF" style={styles.contactlessIcon} />
              </View>
            </View>

            {/* Card Bottom Section */}
            <View style={styles.cardBottom}>
              <View style={styles.cardBottomContent}>
                <View>
                  <Text style={styles.cardDate}>23/01</Text>
                  <Text style={styles.cardName}>JAYAKUMAR JK TRADERS</Text>
                </View>
                <Text style={styles.cardNumber}>···· ···· ···· 0930</Text>
              </View>
            </View>
          </View>
        </View>

        {/* UPI & QR Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPI & QR Setup</Text>
          <View style={styles.qrUploadContainer}>
            <View style={styles.uploadBox}>
              <Ionicons name="camera-outline" size={40} color="#CCC" />
              <Text style={styles.uploadText}>Upload screenshot or photo</Text>
              <Text style={styles.uploadSubtext}>This QR will be automatically added to your digital invoices</Text>
            </View>
            <View style={styles.upiIdContainer}>
              <Text style={styles.upiLabel}>UPI ID:</Text>
              <TextInput
                style={styles.upiInput}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="Enter UPI ID"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.paymentOptions}>
          <View style={styles.paymentOption}>
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIcon, { backgroundColor: '#FFE8E8' }]}>
                <Ionicons name="cash-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>Enable Cash Payments</Text>
                <Text style={styles.paymentSubtitle}>Record cash sales in ledger</Text>
              </View>
            </View>
            <Switch
              value={cashPaymentsEnabled}
              onValueChange={setCashPaymentsEnabled}
              trackColor={{ false: '#D1D1D6', true: '#4CD964' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D1D6"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentOption}>
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIcon, { backgroundColor: '#E8F4FF' }]}>
                <Ionicons name="card-outline" size={24} color="#4A90E2" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>Credit/Debit Cards</Text>
                <Text style={styles.paymentSubtitle}>Offline terminal processing</Text>
              </View>
            </View>
            <Switch
              value={cardPaymentsEnabled}
              onValueChange={setCardPaymentsEnabled}
              trackColor={{ false: '#D1D1D6', true: '#4CD964' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D1D6"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

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
  paymentOptions: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
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
});
