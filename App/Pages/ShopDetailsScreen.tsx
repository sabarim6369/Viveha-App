import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import API_URL from '../api';

export default function ShopDetailsScreen({ navigation }: any) {

  const [shopName, setShopName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gstinUin, setGstinUin] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const indianStates = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
  ];

  const filteredStates = indianStates.filter((stateName) =>
    stateName.toLowerCase().includes(stateSearch.toLowerCase())
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleImagePick = async () => {
    Alert.alert(
      'Add Profile Picture',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {

            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
              Alert.alert("Camera permission required");
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8
            });

            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {

            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
              Alert.alert("Gallery permission required");
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 0.8
            });

            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleNext = async () => {
    if (!profileImage) {
      Toast.show({
        type: 'error',
        text1: 'Profile Image Required',
        text2: 'Please upload a shop/profile image to continue',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    if (!shopName || !location || phoneNumber.length < 10 || loading) return;

    const shopDetails = {
      shopName,
      businessName: shopName,
      location,
      city,
      state: selectedState,
      profileImage,
      phoneNumber,
      gstin: gstinUin
    };

    setLoading(true);

    try {
      await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(shopDetails));

      const response = await axios.post(`${API_URL}/otp/send`, {
        phoneNumber,
        purpose: 'register'
      }, {
        timeout: 30000
      });

      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: response.data.message || 'Please check your phone',
          position: 'bottom',
          visibilityTime: 2000,
        });

        navigation.navigate('ConfirmationCode', shopDetails);
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Failed to Send OTP',
        text2: response.data.message || 'Please try again',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      const errorMsg = error.response?.data?.message || '';

      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        Toast.show({
          type: 'info',
          text1: 'User Already Registered',
          text2: 'Please login instead',
          position: 'bottom',
          visibilityTime: 3000,
        });

        setTimeout(() => {
          navigation.navigate('OTPVerification');
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to Send OTP',
          text2: errorMsg || 'Please check your connection',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  return (

    <SafeAreaView style={styles.container}>

      <StatusBar barStyle="dark-content" />

      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#999" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={60}
      >

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.content}>

            <Text style={styles.title}>Tell us about your shop</Text>

            <Text style={styles.subtitle}>
              To begin creating account, add shop details.
            </Text>

            {/* PROFILE IMAGE (Required) */}

            {!keyboardVisible && (
              <View style={styles.profileImageWrapper}>
                <Text style={styles.label}>Profile Image *</Text>
                <TouchableOpacity
                style={styles.profileImageContainer}
                onPress={handleImagePick}
              >

                {profileImage ? (

                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />

                ) : (

                  <View style={styles.profilePlaceholder}>
                    <Image
                      source={require('../assets/upload.jpeg')}
                      style={styles.profilePlaceholderImage}
                      resizeMode="cover"
                    />
                  </View>

                )}

                {/* <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={18} color="#fff" />
                </View> */}

              </TouchableOpacity>
              </View>
            )}

            {/* SHOP NAME */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Shop Name *</Text>

              <TextInput
                style={styles.input}
                placeholder="Viveha Automobiles"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            {/* LOCATION */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location *</Text>

              <TextInput
                style={styles.textArea}
                placeholder="Street, Area, Building"
                value={location}
                onChangeText={setLocation}
                multiline
              />
            </View>

            {/* CITY AND STATE */}

            <View style={styles.row}>
              <View style={[styles.halfInput]}>
                {/* <Text style={styles.label}>City</Text> */}

                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={[styles.halfInput]}>
                {/* <Text style={styles.label}>State</Text> */}

                <TouchableOpacity
                  style={styles.dropdownButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowStateDropdown((prev) => !prev);
                    if (!showStateDropdown) {
                      setStateSearch('');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownButtonText,
                      !selectedState && styles.dropdownPlaceholder
                    ]}
                    numberOfLines={1}
                  >
                    {selectedState || 'State'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>

                {showStateDropdown && (
                  <View style={styles.dropdownList}>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search state"
                        placeholderTextColor="#999"
                        value={stateSearch}
                        onChangeText={setStateSearch}
                        autoFocus
                      />
                      {stateSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setStateSearch('')}>
                          <Ionicons name="close-circle" size={16} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView
                      nestedScrollEnabled
                      style={styles.dropdownScroll}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredStates.length > 0 ? (
                        filteredStates.map((stateName) => (
                          <TouchableOpacity
                            key={stateName}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedState(stateName);
                              setShowStateDropdown(false);
                              setStateSearch('');
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{stateName}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>No states found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number</Text>

              <TextInput
                style={styles.input}
                placeholder="+91-"
                placeholderTextColor="#999"
                value={phoneNumber ? `+91-${phoneNumber}` : ''}
                onChangeText={(text: string) => {
                  const cleaned = text.replace('+91-', '');
                  setPhoneNumber(formatPhoneNumber(cleaned));
                }}
                keyboardType="phone-pad"
              />
            </View>

            {/* GST */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Additional Details (optional)</Text>

              <TextInput
                style={styles.input}
                placeholder="GSTIN / UIN"
                value={gstinUin}
                onChangeText={setGstinUin}
              />
            </View>

            {/* TERMS */}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TermsAgreement', {})}
            >
              <Text style={styles.termsText}>
                By continuing, you agree to the <Text style={styles.termsLink}>Terms of Service</Text> and confirm that you have read our <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

      {/* NEXT BUTTON */}

      <View style={styles.bottomSection}>

        <TouchableOpacity
          style={[styles.button, (!profileImage || !shopName || !location || phoneNumber.length < 10 || loading) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!profileImage || !shopName || !location || phoneNumber.length < 10 || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('OTPVerification')}
        >
          <Text style={styles.loginButtonText}>
            Already have an account? <Text style={styles.loginButtonTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>

        {/* Branding */}
        <View style={styles.footerBranding}>
          <Image
            source={require('../assets/loginpage.jpeg')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>

      </View>

    </SafeAreaView>

  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff'
  },

  backButton: {
    paddingTop: 24,
    paddingLeft: 20
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 8
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4
  },

  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 14
  },

  profileImageContainer: {
    width: 84,
    height: 84,
    alignSelf: 'center',
    marginBottom: 14
  },

  profilePlaceholder: {
    width: 84,
    height: 90,
    borderRadius: 42,
    backgroundColor: '#dfd9d8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },

  profilePlaceholderImage: {
    width: '100%',
    height: '100%'
  },

  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42
  },

  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center'
  },

  inputContainer: {
    marginBottom: 18
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },

  halfInput: {
    flex: 1
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
    color: '#222'
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 46
  },

  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 62,
    textAlignVertical: 'top'
  },

  dropdownButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  dropdownButtonText: {
    flex: 1,
    color: '#111',
    marginRight: 8
  },

  dropdownPlaceholder: {
    color: '#999'
  },

  dropdownList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    backgroundColor: '#fff',
    maxHeight: 180,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    }
  },

  dropdownScroll: {
    maxHeight: 180
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    paddingHorizontal: 14,
    paddingVertical: 8
  },

  searchIcon: {
    marginRight: 8
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    paddingVertical: 0
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1'
  },

  dropdownItemText: {
    fontSize: 14,
    color: '#333'
  },

  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },

  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },

  termsText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#999',
    marginTop: 4,
    lineHeight: 14
  },

  termsLink: {
    color: '#FF6B35',
    fontWeight: '600'
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 14
  },

  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 13,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center'
  },

  buttonDisabled: {
    opacity: 0.5
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  footerBranding: {
    alignItems: "center",
    marginTop: 8,
  },

  footerLogo: {
    width: 60,
    height: 40,
  },
  loginButton: {
    alignItems: "center",
    marginTop: 10,
  },

  loginButtonText: {
    fontSize: 13,
    color: "#666",
  },

  loginButtonTextBold: {
    fontWeight: "600",
    color: "#FF6B35",
  },

});