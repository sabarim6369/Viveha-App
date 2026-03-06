import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface ShopDetailsScreenProps {
  navigation: any;
}

export default function ShopDetailsScreen({ navigation }: ShopDetailsScreenProps): React.JSX.Element {
  const [shopName, setShopName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [showStateDropdown, setShowStateDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [gstinUin, setGstinUin] = useState<string>('');

  const indianStates: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  // Filter states based on search query
  const filteredStates = indianStates.filter(state => 
    state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImagePick = async (): Promise<void> => {
    Alert.alert(
      'Add Profile Picture',
      'Choose an option',
      [
        { 
          text: 'Take Photo', 
          onPress: async (): Promise<void> => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required to take photos');
              return;
            }
            
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            
            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        { 
          text: 'Choose from Gallery', 
          onPress: async (): Promise<void> => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Gallery permission is required to select photos');
              return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
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

  const handleNext = async (): Promise<void> => {
    if (shopName && location) {
      // Save shop details to AsyncStorage
      try {
        const shopDetails = {
          shopName,
          location,
          city,
          state: selectedState,
          ownerName,
          profileImage,
          gstin: gstinUin
        };
        await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(shopDetails));
      } catch (error) {
        console.error('Error saving shop details:', error);
      }

      navigation.navigate('MobileNumber', { 
        shopName, 
        location,
        city,
        state: selectedState,
        ownerName,
        businessName: shopName,
        profileImage,
        gstin: gstinUin
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#999" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.content}>
          <Text style={styles.title}>Tell us about your shop</Text>
          <Text style={styles.subtitle}>
            To begin creating account, add shop details.
          </Text>

          {/* Profile Picture Upload */}
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handleImagePick}
            activeOpacity={0.7}
          >
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={60} color="#CCC" />
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Shop Name<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Viveha Automobiles"
              placeholderTextColor="#CCC"
              value={shopName}
              onChangeText={setShopName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Street Address, Area, Building"
              placeholderTextColor="#CCC"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.halfInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#CCC"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.halfInputContainer}>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  setShowStateDropdown(!showStateDropdown);
                  if (showStateDropdown) {
                    setSearchQuery('');
                  }
                }}
              >
                <Text style={[styles.dropdownButtonText, !selectedState && styles.placeholder]}>
                  {selectedState || 'State'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons 
                    name="search"
                    size={16} 
                    color="#999" 
                  />
                  <MaterialIcons 
                    name="keyboard-arrow-down"
                    size={20} 
                    color="#999" 
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {showStateDropdown && (
            <View style={styles.dropdownList}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search state..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {filteredStates.length > 0 ? (
                  filteredStates.map((state: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedState(state);
                        setShowStateDropdown(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{state}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No states found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Owner Name <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#CCC"
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Additional Details <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="GSTIN / UIN"
              placeholderTextColor="#CCC"
              value={gstinUin}
              onChangeText={setGstinUin}
            />
          </View>

          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => navigation.navigate('TermsAgreement', {})}
            activeOpacity={0.7}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and confirm that you have read our{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.button, (!shopName || !location) && styles.buttonDisabled]}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={!shopName || !location}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('OTPVerification')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>
            Already have an account? <Text style={styles.loginButtonTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <Image 
            source={require('../assets/logo2.png')} 
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>viveha.ai</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    paddingTop: 40,
    paddingLeft: 20,
    paddingBottom: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 28,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE5E0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#000',
  },
  optional: {
    fontWeight: '400',
    color: '#999',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfInputContainer: {
    flex: 1,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#333',
  },
  placeholder: {
    color: '#CCC',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: -12,
    marginBottom: 20,
    marginHorizontal: 24,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 6,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  loginButtonText: {
    fontSize: 14,
    color: '#666',
  },
  loginButtonTextBold: {
    fontWeight: '600',
    color: '#FF6B35',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  footerLogo: {
    width: 18,
    height: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  termsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#FF6B35',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
