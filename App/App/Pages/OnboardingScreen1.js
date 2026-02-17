import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function OnboardingScreen1({ navigation }) {
  const handleNext = () => {
    navigation.navigate('Onboarding2');
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Image 
          source={require('../assets/bill.jpeg')} 
          style={styles.illustration}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Effortless Billing</Text>
        <Text style={styles.description}>
          Create invoices in seconds with fast SKU entry and voice-to-text input. Supports normal, GST and quotation billing with a default product list to reduce manual setup, speed up checkout and cut manpower effort.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>

        <Text style={styles.branding}>✓ viveha.ai</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  skipButton: {
    position: 'absolute',
    top: 45,
    right: 25,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#CCC',
    fontSize: 15,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingTop: 40,
  },
  illustration: {
    width: 300,
    height: 300,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 15,
  },
  footer: {
    paddingBottom: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FF8A65',
    paddingVertical: 16,
    width: '100%',
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  branding: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '500',
  },
});
