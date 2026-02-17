import React, { useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../api';
import { clearAllUserData, fetchAllUserData } from '../utils/NetworkManager';

const { width } = Dimensions.get('window');

export default function VerificationCodeScreen({ navigation, route }) {
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const phoneNumber = route.params?.phoneNumber || '';

  const handleCodeChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length === 4) {
      setLoading(true);
      try {
        // Clear any previous user data to prevent data leakage
        await clearAllUserData();
        
        // Login with OTP (backend will verify OTP and create session)
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          phoneNumber: phoneNumber,
          otp: verificationCode
        }, {
          timeout: 30000
        });

        if (loginResponse.data.success) {
          // Fetch client details from backend
          const clientResponse = await axios.get(`${API_URL}/auth/client/${loginResponse.data.clientId}`, {
            headers: {
              Authorization: `Bearer ${loginResponse.data.token}`
            },
            timeout: 30000
          });

          if (clientResponse.data.success) {
            const clientData = clientResponse.data.client;
            
            // Store shop details in AsyncStorage
            const shopDetails = {
              shopName: clientData.businessName,
              ownerName: clientData.ownerName,
              phoneNumber: clientData.phoneNumber,
              clientId: clientData._id
            };
            
            await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(shopDetails));
            await AsyncStorage.setItem('@viveha_token', loginResponse.data.token);
            await AsyncStorage.setItem('@viveha_client_id', loginResponse.data.clientId);
            await AsyncStorage.setItem('@viveha_device_session_id', loginResponse.data.deviceSessionId);
            
            // Fetch user-specific data from backend
            await fetchAllUserData();
            
            alert('Login successful!');
            
            // Navigate to Success with all data
            navigation.navigate('Success', {
              token: loginResponse.data.token,
              clientId: loginResponse.data.clientId,
              deviceSessionId: loginResponse.data.deviceSessionId,
              shopName: clientData.businessName,
              ownerName: clientData.ownerName,
              phoneNumber: clientData.phoneNumber,
              isRegistration: false // Existing user login
            });
          } else {
            alert('Failed to fetch user details');
          }
        } else {
          alert(loginResponse.data.message || 'Login failed');
          setCode(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } catch (error) {
        console.error('Login Error:', error);
        // If login fails, user might not be registered
        if (error.response?.status === 401) {
          const errorMsg = error.response?.data?.message || '';
          if (errorMsg.includes('Client not found') || errorMsg.includes('not found')) {
            alert('User not registered. Redirecting to registration...');
            // Redirect to registration flow with phone number
            navigation.navigate('ShopDetails');
          } else {
            alert(errorMsg || 'Login failed. Please check your OTP and try again.');
            setCode(['', '', '', '']);
            inputRefs.current[0]?.focus();
          }
        } else {
          alert(error.response?.data?.message || 'Login failed. Please try again.');
          setCode(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } finally {
        setLoading(false);
      }
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Section with Logo */}
          <View style={styles.topSection}>
        <View style={styles.headerLogo}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>viveha.ai</Text>
        </View>
      </View>

      {/* Bottom Section - Full Width Gradient Card */}
      <View style={styles.bottomSection}>
        {/* Overlapping Logo */}
        <View style={styles.overlappingLogoContainer}>
          <View style={styles.overlappingLogo}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.overlappingLogoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <LinearGradient
          colors={['#8B9FE8', '#E88E99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.cardContent}>
            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>
              We have sent the verification code to your{'\n'}
              phone number +91-XXXXX XXXXX
            </Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <View key={index} style={styles.inputBox}>
                  <TextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={styles.codeInput}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.button, (code.join('').length < 4 || loading) && styles.buttonDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={code.join('').length < 4 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirm</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to the Terms of Service and confirm{'\n'}
              that you have read our Privacy Policy
            </Text>
          </View>
        </LinearGradient>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: Dimensions.get('window').height - 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  topSection: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  headerLogo: {
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  bottomSection: {
    position: 'relative',
  },
  overlappingLogoContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  overlappingLogo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#E88E99',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  overlappingLogoImage: {
    width: 60,
    height: 60,
  },
  gradientCard: {
    width: width,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  cardContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 30,
  },
  inputBox: {
    width: 60,
    height: 60,
  },
  codeInput: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#FF9A5F',
    borderRadius: 30,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
  },
});
