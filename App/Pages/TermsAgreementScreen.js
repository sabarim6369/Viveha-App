import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsAgreementScreen({ navigation, route }) {
  const handleAgree = () => {
    navigation.navigate('ProfilePicture', route.params);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#999" />
      </TouchableOpacity>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Agree to Viveha's terms{'\n'}and policies</Text>
          
          <Text style={styles.description}>
            People who use our service may have uploaded your contact information to Viveha.{' '}
            <Text style={styles.link}>Learn more</Text>
          </Text>

          <Text style={styles.description}>
            By tapping <Text style={styles.bold}>I agree</Text>, you agree to create an account and to Viveha's{' '}
            <Text style={styles.link}>Terms</Text>, <Text style={styles.link}>Privacy Policy</Text> and{' '}
            <Text style={styles.link}>Cookie Policy</Text>.
          </Text>

          <Text style={styles.description}>
            The <Text style={styles.link}>Privacy Policy</Text> describes the ways we can use the information we collect when you create an account. For example, we use this information to provide, Personalise and improve our products, including ads.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleAgree}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>I agree</Text>
        </TouchableOpacity>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>viveha.ai</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    paddingTop: 50,
    paddingLeft: 20,
    paddingBottom: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    lineHeight: 20,
  },
  link: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  footerLogo: {
    width: 18,
    height: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
});
