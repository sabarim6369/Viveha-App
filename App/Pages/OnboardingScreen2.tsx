import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

interface OnboardingScreen2Props {
  navigation: any;
}

export default function OnboardingScreen2({ navigation }: OnboardingScreen2Props): React.JSX.Element {
  const handleNext = () => {
    navigation.navigate('Onboarding3');
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
          source={require('../assets/inventory.jpeg')} 
          style={styles.illustration}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Smart Inventory</Text>
        <Text style={styles.description}>
          Never run out of stock with automatic low-stock alerts and smart reorder lists grouped by dealer. Needed items are auto-added to each dealer's order list so you can enter quantities and share orders instantly.
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
