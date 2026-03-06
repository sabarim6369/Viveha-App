import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoScreenProps {
  navigation: any;
}

export default function LogoScreen({ navigation }: LogoScreenProps): React.JSX.Element {
  React.useEffect(() => {
    // Navigate to Name screen after 2 seconds
    const timer = setTimeout(() => {
      navigation.navigate('Name');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/logo2.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: 120,
    height: 120,
  },
});
