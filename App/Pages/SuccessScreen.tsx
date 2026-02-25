import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

// Type definitions
interface SuccessScreenProps {
  navigation: any;
}

export default function SuccessScreen({ navigation }: SuccessScreenProps): React.JSX.Element {
  const handleContinue = (): void => {
    // After successful registration or login, always go to Home
    // Onboarding screens are shown only on first app launch
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>Success!</Text>
      <Text style={styles.subtitle}>
        Congratulations! You have been{'\n'}
        successfully authenticated
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#FF8C5A',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 80,
    width: '90%',
    maxWidth: 350,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
