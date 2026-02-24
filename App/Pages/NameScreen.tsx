import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NameScreenProps {
  navigation: any;
}

export default function NameScreen({ navigation }: NameScreenProps): React.JSX.Element {
  React.useEffect(() => {
    // Check if user is new or returning
    const checkUserStatus = async (): Promise<void> => {
      try {
        const isNewUser = await AsyncStorage.getItem('isNewUser');
        
        setTimeout(() => {
          if (isNewUser === 'false') {
            // Returning user - go directly to verification
            navigation.navigate('OTPVerification');
          } else {
            // New user - go through onboarding
            navigation.navigate('ShopDetails');
          }
        }, 2000);
      } catch (error) {
        // Default to new user if error
        setTimeout(() => {
          navigation.navigate('ShopDetails');
        }, 2000);
      }
    };
    
    checkUserStatus();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/logo.png')} 
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.brandText}>viveha.ai</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});
