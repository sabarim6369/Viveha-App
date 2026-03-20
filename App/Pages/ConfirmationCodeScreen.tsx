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
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../api';
import Toast from 'react-native-toast-message';

interface ConfirmationCodeScreenProps {
  navigation: any;
  route: any;
}

export default function ConfirmationCodeScreen({ navigation, route }: ConfirmationCodeScreenProps): React.JSX.Element {
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const phoneNumber = route.params?.phoneNumber || '0000000000';

  const handleCodeChange = (text: string, index: number): void => {
    // Only allow single digit
    const digit = text.slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number): void => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const uploadProfileImage = async (imageUri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      
      // Extract filename from URI
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const fileType = filename.split('.').pop() || 'jpg';
      
      // Create file object for upload
      const file = {
        uri: imageUri,
        name: filename,
        type: `image/${fileType}`,
      } as any;
      
      formData.append('profileImage', file);
      
      const uploadResponse = await axios.post(`${API_URL}/upload/profile-picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      if (uploadResponse.data.success) {
        return uploadResponse.data.profileUrl;
      }
      return null;
    } catch (error: any) {
      console.error('Image upload error:', error);
      return null;
    }
  };

  const handleNext = async (): Promise<void> => {
    const confirmationCode = code.join('');
    if (confirmationCode.length === 4) {
      setLoading(true);
      try {
        // Upload profile image if exists
        let profileUrl = route.params?.profileUrl || '';
        
        // Check if we have a local profileImage that needs to be uploaded
        if (route.params?.profileImage && !route.params?.profileUrl) {
          const uploadedUrl = await uploadProfileImage(route.params.profileImage);
          if (uploadedUrl) {
            profileUrl = uploadedUrl;
          }
        }
        
        // Register the user with OTP (backend will verify and register in one step)
        const registerResponse = await axios.post(`${API_URL}/auth/register`, {
          phoneNumber: phoneNumber,
          otp: confirmationCode,
          ownerName: route.params?.shopOwner || route.params?.businessName || 'My Business',
          businessName: route.params?.businessName || route.params?.shopOwner || 'My Business',
          shopName: route.params?.shopName || '',
          location: route.params?.location || '',
          city: route.params?.city || '',
          state: route.params?.state || '',
          gstin: route.params?.gstin || '',
          profileUrl: profileUrl
        }, {
          timeout: 30000
        });

        if (registerResponse.data.success) {
          // Save clientId and other auth data to AsyncStorage immediately after registration
          await AsyncStorage.setItem('@viveha_client_id', registerResponse.data.clientId);
          if (registerResponse.data.token) {
            await AsyncStorage.setItem('@viveha_token', registerResponse.data.token);
          }
          if (registerResponse.data.deviceSessionId) {
            await AsyncStorage.setItem('@viveha_device_session_id', registerResponse.data.deviceSessionId);
          }

          Toast.show({
            type: 'success',
            text1: 'Registration Successful!',
            text2: 'Welcome to Viveha',
            position: 'bottom',
            visibilityTime: 2000,
          });
          
          navigation.navigate('InvoiceCustomization', {
            ...route.params,
            confirmationCode,
            clientId: registerResponse.data.clientId,
            isRegistration: true
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: registerResponse.data.message || 'Please try again',
            position: 'bottom',
            visibilityTime: 3000,
          });
          setCode(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } catch (error: any) {
        console.error('Registration Error:', error);
        const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
        
        Toast.show({
          type: 'error',
          text1: 'Registration Error',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 3000,
        });
        
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendCode = async (): Promise<void> => {
    setCode(['', '', '', '']);
    inputRefs.current[0]?.focus();

    try {
      setResending(true);

      const response = await axios.post(`${API_URL}/otp/send`, {
        phoneNumber,
        purpose: 'register'
      }, {
        timeout: 30000
      });

      if (response.data.success) {
        Toast.show({
          type: 'success',
          text1: 'Code sent again',
          text2: response.data.message || 'Please check your phone',
          position: 'bottom',
          visibilityTime: 2500,
        });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Failed to resend code',
        text2: response.data.message || 'Please try again',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      console.error('Resend OTP Error:', error);

      Toast.show({
        type: 'error',
        text1: 'Failed to resend code',
        text2: error.response?.data?.message || 'Please check your connection',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={"arrow-back" as any} size={24} color="#666" />
          </TouchableOpacity>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Enter the confirmation code</Text>
            <Text style={styles.subtitle}>
              To confirm your account, enter the 4-digit code that we sent via SMS to {phoneNumber}
            </Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <View key={index} style={styles.inputBox}>
                  <TextInput
                    ref={(ref) => { if (ref) inputRefs.current[index] = ref; return undefined; }}
                    style={styles.input}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextButton, (code.join('').length < 4 || loading) && styles.buttonDisabled]}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={code.join('').length < 4 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendButton, resending && styles.buttonDisabled]}
              onPress={handleResendCode}
              activeOpacity={0.7}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={styles.resendButtonText}>I didn't recieve the code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <Image
              source={require('../assets/loginpage.jpeg')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            {/* <Text style={styles.footerText}>viveha.ai</Text> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    paddingTop: 50,
    paddingLeft: 20,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
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
    marginBottom: 32,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  inputBox: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    width: '100%',
  },
  nextButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resendButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
    gap: 6,
  },
  footerLogo: {
    width: 60,
    height:60,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
});
