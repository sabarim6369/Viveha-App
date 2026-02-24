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

interface ConfirmationCodeScreenProps {
  navigation: any;
  route: any;
}

export default function ConfirmationCodeScreen({ navigation, route }: ConfirmationCodeScreenProps): React.JSX.Element {
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
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

  const handleNext = async (): Promise<void> => {
    const confirmationCode = code.join('');
    if (confirmationCode.length === 4) {
      setLoading(true);
      try {
        // Register the user with OTP (backend will verify and register in one step)
        const registerResponse = await axios.post(`${API_URL}/auth/register`, {
          phoneNumber: phoneNumber,
          otp: confirmationCode,
          ownerName: route.params?.ownerName || 'User',
          businessName: route.params?.businessName || route.params?.shopName || 'My Business',
          shopName: route.params?.shopName || '',
          location: route.params?.location || '',
          city: route.params?.city || '',
          state: route.params?.state || '',
          gstin: route.params?.gstin || '',
          profileUrl: route.params?.profileUrl || ''
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
          
          alert('Registration successful!');
          navigation.navigate('TermsAgreement', {
            ...route.params,
            confirmationCode,
            clientId: registerResponse.data.clientId,
            registered: true
          });
        } else {
          alert(registerResponse.data.message || 'Registration failed');
          setCode(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } catch (error: any) {
        console.error('Registration Error:', error);
        alert(error.response?.data?.message || 'Registration failed. Please try again.');
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendCode = (): void => {
    // Reset code
    setCode(['', '', '', '']);
    inputRefs.current[0]?.focus();
    // In real app, trigger resend SMS
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
          style={styles.resendButton}
          onPress={handleResendCode}
          activeOpacity={0.7}
        >
          <Text style={styles.resendButtonText}>I didn't recieve the code</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerText}>viveha.ai</Text>
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
    width: 20,
    height: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
});
