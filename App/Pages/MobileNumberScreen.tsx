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
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_URL from '../api';

const { width } = Dimensions.get('window');

interface MobileNumberScreenProps {
  navigation: any;
  route: any;
}

export default function MobileNumberScreen({ navigation, route }: MobileNumberScreenProps): React.JSX.Element {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleNext = async (): Promise<void> => {
    if (phoneNumber.length >= 10) {
      setLoading(true);
      try {
        // Send OTP with 10-digit number only
        const response = await axios.post(`${API_URL}/otp/send`, {
          phoneNumber: phoneNumber,
          purpose: 'register'
        }, {
          timeout: 30000
        });

        if (response.data.success) {
          alert(response.data.message || 'OTP sent successfully!');
          navigation.navigate('ConfirmationCode', { 
            ...route.params,
            phoneNumber: phoneNumber
          });
        } else {
          alert(response.data.message || 'Failed to send OTP');
        }
      } catch (error: any) {
        console.error('Send OTP Error:', error);
        alert(error.response?.data?.message || 'Failed to send OTP. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    return cleaned.slice(0, 10);
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
        <Text style={styles.title}>What's your mobile number?</Text>
        <Text style={styles.subtitle}>
          Enter the mobile number on which you can be{'\n'}contacted.
        </Text>

        <View style={styles.inputContainer}>
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

        <Text style={styles.disclaimer}>
          You may receive WhatsApp and SMS notifications from us{'\n'}for security and login purposes.
        </Text>

        <TouchableOpacity 
          style={[styles.button, (phoneNumber.length < 10 || loading) && styles.buttonDisabled]}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={phoneNumber.length < 10 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Next</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('OTPVerification')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>Already have an account? <Text style={styles.loginButtonTextBold}>Login</Text></Text>
        </TouchableOpacity>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Image 
          source={require('../assets/logo2.png')} 
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
    paddingTop: 40,
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
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '400',
  },
  loginButtonTextBold: {
    color: '#FF6B35',
    fontWeight: '600',
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
