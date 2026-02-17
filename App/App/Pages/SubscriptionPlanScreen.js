import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SubscriptionPlanScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const handleClaimNow = () => {
    // Handle subscription claim logic here
    console.log('Claimed:', selectedPlan);
    navigation.navigate('Home');
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

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
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Claim{'\n'}6month{'\n'}discount
          </Text>

          <View style={styles.offerInfo}>
            <Text style={styles.limitedText}>Limited time offer</Text>
            <Text style={styles.offerDescription}>
              6 Month 84% off on{'\n'}Unlimited Access
            </Text>
          </View>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {/* Yearly Plan */}
            <TouchableOpacity 
              style={[
                styles.planCard, 
                selectedPlan === 'yearly' && styles.planCardSelected
              ]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.9}
            >
              <View style={styles.planContent}>
                <Text style={styles.planPrice}>Yearly $14.99</Text>
                <Text style={styles.planSubPrice}>($1.25 / month)</Text>
              </View>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>84% OFF</Text>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity 
              style={[
                styles.planCard, 
                selectedPlan === 'monthly' && styles.planCardSelected
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.9}
            >
              <Text style={styles.planPrice}>Monthly $7.99</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.claimButton}
            onPress={handleClaimNow}
            activeOpacity={0.8}
          >
            <Text style={styles.claimButtonText}>Claim it Now</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dontShowButton}
            onPress={handleSkip}
          >
            <Text style={styles.dontShowText}>Don't show this Offer</Text>
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
    marginBottom: 20,
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
    paddingTop: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 56,
    marginBottom: 30,
  },
  offerInfo: {
    marginBottom: 40,
  },
  limitedText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    opacity: 0.9,
  },
  offerDescription: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.9,
  },
  plansContainer: {
    gap: 15,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  planContent: {
    flex: 1,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  planSubPrice: {
    fontSize: 14,
    color: '#666666',
  },
  badgeContainer: {
    backgroundColor: '#FF9B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    paddingBottom: 40,
  },
  claimButton: {
    backgroundColor: '#FF9B6B',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dontShowButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dontShowText: {
    color: '#FFFFFF',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default SubscriptionPlanScreen;
