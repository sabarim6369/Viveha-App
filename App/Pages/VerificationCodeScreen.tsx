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
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../api';
import Toast from 'react-native-toast-message';
import { clearAllUserData, fetchAllUserData } from '../utils/NetworkManager';

const { width } = Dimensions.get('window');

interface VerificationCodeScreenProps {
  navigation: any;
  route: any;
}

export default function VerificationCodeScreen({ navigation, route }: VerificationCodeScreenProps): React.JSX.Element {
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const phoneNumber = route.params?.phoneNumber || '';

  const handleCodeChange = (text: string, index: number): void => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number): void => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async (): Promise<void> => {
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
            Toast.show({
              type: 'error',
              text1: 'Login Failed',
              text2: 'Failed to fetch user details',
              position: 'bottom',
              visibilityTime: 3000,
            });
          }
        } else {
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: loginResponse.data.message || 'Please check your OTP',
            position: 'bottom',
            visibilityTime: 3000,
          });
          setCode(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } catch (error: any) {
        console.error('Login Error:', error);
        // If login fails, user might not be registered
        if (error.response?.status === 401) {
          const errorMsg = error.response?.data?.message || '';
          if (errorMsg.includes('Client not found') || errorMsg.includes('not found')) {
            Toast.show({
              type: 'info',
              text1: 'User Not Registered',
              text2: 'Redirecting to registration...',
              position: 'bottom',
              visibilityTime: 3000,
            });
            // Redirect to registration flow with phone number
            setTimeout(() => {
              navigation.navigate('ShopDetails');
            }, 1500);
          } else {
            Toast.show({
              type: 'error',
              text1: 'Invalid OTP',
              text2: errorMsg || 'Please check your OTP and try again',
              position: 'bottom',
              visibilityTime: 3000,
            });
            setCode(['', '', '', '']);
            inputRefs.current[0]?.focus();
          }
        } else {
          Toast.show({
            type: 'error',
            text1: 'Login Error',
            text2: error.response?.data?.message || 'Please try again',
            position: 'bottom',
            visibilityTime: 3000,
          });
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
        <Ionicons name={"arrow-back" as any} size={24} color="#999" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Section with Logo */}
          <View style={styles.topSection}>
            <View style={styles.headerLogo}>
              <Image
                source={require('../assets/loginpage.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
             
            </View>
          </View>

          {/* Bottom Section - Full Width Gradient Card */}
          <View style={styles.bottomSection}>
            {/* Overlapping Logo */}
            <View style={styles.overlappingLogoContainer}>
              <Image
  source={require('../assets/logo2.png')}
  style={styles.overlappingLogoImage}
  resizeMode="contain"
/>
            </View>

            <LinearGradient
              colors={['#7E93E6', '#E76E6A']}
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
                        ref={(ref) => { if (ref) inputRefs.current[index] = ref; return undefined; }}
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

                <TouchableOpacity
                  onPress={() => navigation.navigate('TermsAgreement', {})}
                  activeOpacity={0.8}
                >
                  <Text style={styles.termsText}>
                    By continuing, you agree to the Terms of Service and confirm{ '\n'}
                    that you have read our Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <View style={styles.antiGapBlock} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "#F5F5F5"
},
  scroll: {
    flex: 1,
    backgroundColor: '#E76E6A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  backgroundColor: '#F5F5F5'
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
  flex: 1,
  minHeight: 200,   // increased from 150
  justifyContent: 'center',
  alignItems: 'center',
  paddingBottom: 40,
},

headerLogo: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
},

logo: {
  width: 140,   // increased from 50
  height: 140,  // increased from 50
},
  brandText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#333',
  },
  bottomSection: {
    position: 'relative',
    marginTop: 'auto', // Pushes to bottom robustly
  },
  antiGapBlock: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 500,
    backgroundColor: '#E76E6A',
    zIndex: -1,
  },
overlappingLogoContainer: {
  position: 'absolute',
   top: -55,
  left: 0,
  right: 0,
  zIndex: 10,
  alignItems: 'center',
},
  overlappingLogo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#E76E6A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  overlappingLogoImage: {
   width: 110,
  height: 110,
  },
  gradientCard: {
    width: '100%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 70,
paddingBottom: 170,    paddingHorizontal: 30,
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
