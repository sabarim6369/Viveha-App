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
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_URL from '../api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface OTPVerificationScreenProps {
  navigation: any;
}

export default function OTPVerificationScreen({ navigation }: OTPVerificationScreenProps): React.JSX.Element {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handlePhoneChange = (text: string): void => {
    // Remove all non-numeric characters
    const numericOnly = text.replace(/[^0-9]/g, '');

    // Limit to 10 digits
    if (numericOnly.length <= 10) {
      setPhoneNumber(numericOnly);
      setError('');
    }
  };

  const handleContinue = async (): Promise<void> => {
    // Validation checks
    if (phoneNumber.length === 0) {
      setError('Phone number is required');
      return;
    }

    if (phoneNumber.length < 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    // Check if number starts with valid digits (6-9 for Indian mobile numbers)
    if (!['6', '7', '8', '9'].includes(phoneNumber[0])) {
      setError('Please enter a valid mobile number');
      return;
    }

    // All validations passed
    setError('');
    setLoading(true);

    try {
      // Send OTP
      const response = await axios.post(`${API_URL}/otp/send`, {
        phoneNumber: phoneNumber,
        purpose: 'login'
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
        navigation.navigate('VerificationCode', { phoneNumber });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to Send OTP',
          text2: response.data.message || 'Please try again',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send OTP. Please check your connection.';
      
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: errorMessage,
        position: 'bottom',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />


      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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
                source={require('../assets/logo2.png')}
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
                  source={require('../assets/logo2.png')}
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
                <Text style={styles.title}>OTP Verification</Text>
                <Text style={styles.subtitle}>
                  Enter phone number to send one time{'\n'}
                  password
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Phone Number</Text>
                    <Text style={styles.charCount}>{phoneNumber.length}/10</Text>
                  </View>
                  <TextInput
                    style={[styles.input, error ? styles.inputError : null]}
                    placeholder="Enter 10 digit mobile number"
                    placeholderTextColor="#999"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <TouchableOpacity
                  style={[styles.button, (phoneNumber.length < 10 || loading) && styles.buttonDisabled]}
                  onPress={handleContinue}
                  activeOpacity={0.8}
                  disabled={phoneNumber.length < 10 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => navigation.navigate('ShopDetails')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.registerButtonText}>
                    Don't have an account? <Text style={styles.registerButtonTextBold}>Register</Text>
                  </Text>
                </TouchableOpacity>

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
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    width: 50,
    height: 50,
  },
  brandText: {
    fontSize: 26,
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
    marginBottom: 25,
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 25,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 10,
    fontWeight: '500',
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
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  registerButton: {
    marginBottom: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  registerButtonTextBold: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsContainer: {
    marginTop: 12,
  },
  termsText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
