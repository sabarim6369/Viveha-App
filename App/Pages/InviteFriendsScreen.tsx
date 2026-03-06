import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Share,
  Clipboard,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

interface InviteFriendsScreenProps {
  navigation: any;
}

export default function InviteFriendsScreen({ navigation }: InviteFriendsScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = useState<string>('LOADING...');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    loadReferralCode();
    loadUserName();
  }, []);

  const loadReferralCode = async (): Promise<void> => {
    try {
      // Try to get existing referral code
      let code = await AsyncStorage.getItem('@viveha_referral_code');
      
      if (!code) {
        // Generate a new referral code based on phone or random
        const phoneNumber = await AsyncStorage.getItem('@viveha_phone');
        const clientId = await AsyncStorage.getItem('@viveha_client_id');
        
        if (phoneNumber && phoneNumber.length >= 4) {
          // Use last 4 digits of phone + random letters
          const lastDigits = phoneNumber.slice(-4);
          const randomLetters = Math.random().toString(36).substring(2, 6).toUpperCase();
          code = `VH${randomLetters}${lastDigits}`;
        } else if (clientId) {
          // Use client ID
          const shortId = clientId.slice(-8).toUpperCase();
          code = `VH${shortId}`;
        } else {
          // Fallback to random code
          code = `VH${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        }
        
        // Save the generated code
        await AsyncStorage.setItem('@viveha_referral_code', code);
      }
      
      setReferralCode(code);
    } catch (error) {
      console.error('Error loading referral code:', error);
      setReferralCode('VH' + Math.random().toString(36).substring(2, 10).toUpperCase());
    }
  };

  const loadUserName = async (): Promise<void> => {
    try {
      const name = await AsyncStorage.getItem('@viveha_owner_name');
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const handleCopyCode = async (): Promise<void> => {
    Clipboard.setString(referralCode);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: 'Referral code copied to clipboard',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleInvite = async (): Promise<void> => {
    try {
      const message = `Hey! I'm using Viveha for my business invoicing and it's amazing! 📱\n\nJoin using my code: ${referralCode}\nWe'll both get exciting offers! 🎁\n\nDownload now!`;
      
      await Share.share({
        message: message,
        title: 'Join Viveha',
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };

  const handleShare = async (platform: string): Promise<void> => {
    const message = `Hey! Join me on Viveha using code: ${referralCode} and get exciting offers!`;
    
    switch (platform) {
      case 'copy':
        handleCopyCode();
        break;
      case 'whatsapp':
        // In a real app, you'd use a linking library to open WhatsApp
        handleInvite();
        break;
      case 'messenger':
        handleInvite();
        break;
      case 'more':
        handleInvite();
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Top Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerText}>Invite a friend and</Text>
            <Text style={styles.bannerText}>both earn Offers</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Image
              source={require('../assets/logo2.png')}
              style={styles.bannerLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="mail-outline" size={80} color="#E46269" />
          </View>
          <View style={styles.iconBadge1}>
            <Ionicons name="person" size={30} color="#fff" />
          </View>
          <View style={styles.iconBadge2}>
            <Ionicons name="share-social" size={24} color="#E46269" />
          </View>
        </View>

        {/* Referral Code */}
        <View style={styles.codeContainer}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referralCode}</Text>
          </View>
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>Invite your friends and</Text>
        <Text style={styles.title}>get bonus points!</Text>
        <Text style={styles.description}>Share your code with your friends and get</Text>
        <Text style={styles.description}>exciting bonus points</Text>

        {/* Invite Button */}
        <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>

        {/* Share Options */}
        <View style={styles.shareOptions}>
          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('copy')}
          >
            <View style={[styles.shareIconContainer, { backgroundColor: '#333' }]}>
              <Ionicons name="link" size={24} color="#fff" />
            </View>
            <Text style={styles.shareLabel}>Copy url</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('messenger')}
          >
            <View style={[styles.shareIconContainer, { backgroundColor: '#0084FF' }]}>
              <Ionicons name="chatbubbles" size={24} color="#fff" />
            </View>
            <Text style={styles.shareLabel}>Messenger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('whatsapp')}
          >
            <View style={[styles.shareIconContainer, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </View>
            <Text style={styles.shareLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('more')}
          >
            <View style={[styles.shareIconContainer, { backgroundColor: '#666' }]}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </View>
            <Text style={styles.shareLabel}>More</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bannerCard: {
    flexDirection: 'row',
    backgroundColor: '#E46269',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flex: 1,
  },
  bannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bannerIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLogo: {
    width: 35,
    height: 35,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 30,
    height: 200,
    position: 'relative',
  },
  illustrationCircle: {
    width: 150,
    height: 150,
    backgroundColor: '#FFF3F4',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge1: {
    position: 'absolute',
    top: 10,
    right: 80,
    width: 50,
    height: 50,
    backgroundColor: '#6B4FBB',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  iconBadge2: {
    position: 'absolute',
    bottom: 20,
    left: 60,
    width: 45,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E46269',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeBox: {
    borderWidth: 2,
    borderColor: '#E46269',
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E46269',
    letterSpacing: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  inviteButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C42',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 20,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  shareIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
