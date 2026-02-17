import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DiscountOfferScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#F08080', '#E76F6F', '#DC5F5F']}
        style={styles.gradient}
      >
        {/* Skip Button */}
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
            <View style={styles.logo} />
          </View>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.discountText}>84%</Text>
          <Text style={styles.offText}>OFF</Text>
          
          <Text style={styles.saleText}>
            the sale you've been{'\n'}waiting for
          </Text>

          <Text style={styles.description}>
            Unlimited Access, now at 84% off for{'\n'}
            next 6months. There's no better deal
          </Text>
        </View>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => navigation.navigate('SubscriptionPlan')}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E76F6F',
  },
  gradient: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
  },
  logo: {
    width: 35,
    height: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  discountText: {
    fontSize: 110,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 110,
  },
  offText: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: -10,
    marginBottom: 30,
  },
  saleText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 25,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.95,
  },
  footer: {
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#FF9B6B',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DiscountOfferScreen;
