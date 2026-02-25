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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../Components/Footer';

interface RateUsScreenProps {
  navigation: any;
}

export default function RateUsScreen({ navigation }: RateUsScreenProps): React.JSX.Element {
  const [rating, setRating] = useState<number>(0);

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
            onPress: () => navigation.goBack(),
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
            onPress: () => navigation.goBack(),
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
          <View style={styles.illustration}>
            {/* Chat bubble left */}
            <View style={[styles.chatBubble, styles.chatBubbleLeft]}>
              <Ionicons name="chatbubble" size={40} color="#A3C4F3" />
              <Ionicons 
                name="star" 
                size={16} 
                color="#FFD700" 
                style={styles.starIcon}
              />
            </View>
            
            {/* Person icon */}
            <View style={styles.personContainer}>
              <View style={styles.personCircle}>
                <Ionicons name="person" size={60} color="#E88E99" />
              </View>
              <View style={styles.chairBase} />
            </View>

            {/* Chat bubble right */}
            <View style={[styles.chatBubble, styles.chatBubbleRight]}>
              <Ionicons name="chatbubbles" size={40} color="#B8A4E8" />
              <Ionicons 
                name="star" 
                size={16} 
                color="#FFD700" 
                style={styles.starIcon}
              />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Enjoying the App?</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>Rate us your opinion matter to us</Text>

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
                size={40}
                color={star <= rating ? '#FFD700' : '#DDD'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Not Now Button */}
        <TouchableOpacity
          style={styles.notNowButton}
          onPress={() => navigation.goBack()}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  },
  illustration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 20,
  },
  chatBubble: {
    position: 'relative',
    padding: 10,
  },
  chatBubbleLeft: {
    marginTop: -30,
  },
  chatBubbleRight: {
    marginTop: 30,
  },
  starIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  personContainer: {
    alignItems: 'center',
  },
  personCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E88E99',
    marginBottom: 10,
  },
  chairBase: {
    width: 120,
    height: 60,
    backgroundColor: '#7CC8D8',
    borderRadius: 30,
    marginTop: -20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 50,
  },
  starButton: {
    padding: 5,
  },
  notNowButton: {
    backgroundColor: '#FF8C59',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 25,
    shadowColor: '#FF8C59',
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
