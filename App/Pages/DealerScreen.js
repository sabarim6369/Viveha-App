import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Footer from '../Components/Footer';
import {
  createDealer,
  updateDealer,
  useNetworkStatus,
} from '../utils/NetworkManager';

export default function DealerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [dealerLogo, setDealerLogo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dealerId, setDealerId] = useState(null);

  useEffect(() => {
    // If editing an existing dealer, load data
    if (route?.params?.dealer) {
      const dealer = route.params.dealer;
      setDealerId(dealer.id || dealer.serverId);
      setBusinessName(dealer.businessName || dealer.name || '');
      setContactPerson(dealer.contactPerson || '');
      setPhoneNumber(dealer.phoneNumber || '');
      setEmailAddress(dealer.emailAddress || dealer.email || '');
      setOfficeAddress(dealer.officeAddress || dealer.address || '');
      setDealerLogo(dealer.logo || dealer.logoUrl || null);
      setIsEditing(true);
    }
  }, [route]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setDealerLogo(result.assets[0].uri);
    }
  };

  const handleSaveDealer = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter business name');
      return;
    }
    if (!contactPerson.trim()) {
      Alert.alert('Required', 'Please enter contact person name');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter phone number');
      return;
    }

    setLoading(true);

    const dealerData = {
      businessName,
      contactPerson,
      phoneNumber,
      emailAddress,
      officeAddress,
      logo: dealerLogo,
    };

    try {
      let result;
      if (isEditing && dealerId) {
        result = await updateDealer(dealerId, dealerData);
      } else {
        result = await createDealer(dealerData);
      }

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Dealer ${isEditing ? 'updated' : 'created'} successfully!${result.offline ? ' (Will sync when online)' : ''}`,
        });
        
        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else {
        Alert.alert('Error', result.error || 'Failed to save dealer');
      }
    } catch (error) {
      console.error('Error saving dealer:', error);
      Alert.alert('Error', error.message || 'Failed to save dealer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#C4C4C4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Dealer</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={22} color="#E88494" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
            <View style={styles.logoCircle}>
              {dealerLogo ? (
                <Image source={{ uri: dealerLogo }} style={styles.logoImage} />
              ) : (
                <Ionicons name="storefront" size={44} color="#fff" />
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </View>
            <Text style={styles.logoText}>Business Logo / Photo</Text>
          </TouchableOpacity>

          {/* Business Name */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Business Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. JK Parts & Co."
                placeholderTextColor="#C4C4C4"
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>
          </View>

          {/* Contact Person */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Contact Person</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#C4C4C4"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 1234567890"
                placeholderTextColor="#C4C4C4"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="contact@jkparts.com"
                placeholderTextColor="#C4C4C4"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailAddress}
                onChangeText={setEmailAddress}
              />
            </View>
          </View>

          {/* Office Address */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Office Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="123 Industrial Area, Phase II..."
                placeholderTextColor="#C4C4C4"
                value={officeAddress}
                onChangeText={setOfficeAddress}
                multiline
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
            onPress={handleSaveDealer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" style={styles.saveIcon} />
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Update Dealer' : 'Save Dealer'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Footer activeTab="Dealer" navigation={navigation} />
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
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E88494',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E88494',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  logoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  inputSection: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    paddingVertical: 0,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#E88494',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
