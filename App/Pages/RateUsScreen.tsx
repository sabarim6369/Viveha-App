import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';

interface RateUsScreenProps {
  navigation: any;
  route?: any;
}

export default function RateUsScreen({ navigation, route }: RateUsScreenProps): React.JSX.Element {
  const [rating, setRating] = useState<number>(0);

  const handleNavigateBack = () => {
    // Check if we came from invoice creation, then go to Home, otherwise go back
    if (route?.params?.fromInvoiceCreation) {
      navigation.navigate('Home');
    } else {
      navigation.goBack();
    }
  };

  const handleRating = (selectedRating: number) => {
    setRating(selectedRating);
    
    // If user rates 4 or 5 stars, redirect to store
    if (selectedRating >= 4) {
      setTimeout(() => {
        handleRateOnStore();
      }, 500);
    } else if (selectedRating > 0) {
      // For lower ratings, show feedback option
      Alert.alert(
        'Thank You!',
        'We appreciate your feedback. Would you like to share more details with us?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => handleNavigateBack(),
          },
          {
            text: 'Send Feedback',
            onPress: () => {
              // You can navigate to a feedback screen or open email
              Alert.alert('Feedback', 'This will open your email client to send feedback.');
            },
          },
        ]
      );
    }
  };

  const handleRateOnStore = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/id YOUR_APP_ID', // Replace with actual App Store ID
      android: 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME', // Replace with actual package name
    });

    if (storeUrl) {
      Alert.alert(
        'Rate Us',
        'Thank you for your positive feedback! Would you like to rate us on the store?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => handleNavigateBack(),
          },
          {
            text: 'Rate Now',
            onPress: () => {
              Linking.openURL(storeUrl).catch(() => {
                Alert.alert('Error', 'Unable to open store');
              });
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Us</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../assets/rating.jpeg')}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Enjoying the App?</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>Rate us. Your opinion matter to us!</Text>

        {/* Star Rating */}
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRating(star)}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? '#FFD700' : '#DDD'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Not Now Button */}
        <TouchableOpacity
          style={styles.notNowButton}
          onPress={handleNavigateBack}
          activeOpacity={0.8}
        >
          <Text style={styles.notNowText}>Not Now</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Footer activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
 
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  illustrationContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  illustrationImage: {
    width: 320,
    height: 280,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 40,
  },
  starButton: {
    padding: 5,
  },
  notNowButton: {
    backgroundColor: '#F98648',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 25,
    shadowColor: '#F98648',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  notNowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
