import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

interface NameScreenProps {
  navigation: any;
}

export default function NameScreen({ navigation }: NameScreenProps): React.JSX.Element {
  React.useEffect(() => {
    // This screen is only shown for first-time app users
    // After 2 seconds, go to onboarding screens
    const timer = setTimeout(() => {
      navigation.navigate('Onboarding1');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <Image 
          source={require('../assets/logo2.png')} 
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>viveha.ai</Text>
      </View>
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
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});
