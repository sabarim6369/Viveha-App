import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../Components/Footer';
import { clearAllUserData } from '../utils/NetworkManager';
import { useFocusEffect } from '@react-navigation/native';

// Type definitions
interface ProfileScreenProps {
  navigation: any;
}

interface ShopDetails {
  shopName: string;
  location: string;
  city: string;
  state: string;
  ownerName?: string;
  profileImage?: string;
  gstin?: string;
}

interface MenuItem {
  id: number;
  title: string;
  icon: string;
  color: string;
  screen?: string;
  isLogout?: boolean;
  isClearStorage?: boolean;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const defaultMenuIconColor = '#666';

  const [shopDetails, setShopDetails] = useState<ShopDetails>({
    shopName: 'My Shop',
    location: '',
    city: '',
    state: '',
    profileImage: '',
    gstin: ''
  });
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

  useEffect(() => {
    loadShopDetails();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShopDetails();
    }, [])
  );

  const loadShopDetails = async (): Promise<void> => {
    try {
      const details = await AsyncStorage.getItem('@viveha_shop_details');
      if (details) {
        setShopDetails(JSON.parse(details));
      }
    } catch (error) {
      console.error('Error loading shop details:', error);
    }
  };

  const handleClearStorage = async (): Promise<void> => {
    Alert.alert(
      'Clear Storage',
      '⚠️ This will delete all offline data (invoices, items, clients, pending sync, etc.) but keep you logged in. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🧹 Clearing all cached data...');
              // Clear only offline data, not auth tokens
              const keys = [
                '@invoices',
                '@viveha_items',
                '@viveha_clients',
                '@viveha_invoices',
                '@pending_sync',
                '@viveha_pending_sync',
                '@business_info',
                '@viveha_payments',
                '@viveha_drafts',
                '@last_sync',
                '@viveha_last_sync',
                '@sync_status',
                '@viveha_pending_invoices',
                '@viveha_item_groups',
                '@viveha_fetched_payments',
                '@debug_invoice_count',
                '@viveha_user_data',
                '@viveha_cart',
                '@viveha_payment_history',
                '@viveha_shop_details',
                '@viveha_pendings'
              ];

              await AsyncStorage.multiRemove(keys);
              console.log('✅ Cached data cleared successfully');
              Alert.alert(
                'Success', 
                '✅ All offline storage has been cleared!\n\n' +
                'Pull down on the Home screen to reload fresh data from the server.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate to home screen
                      navigation.navigate('Home');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error clearing storage:', error);
              Alert.alert('Error', 'Failed to clear storage. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async (): Promise<void> => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all user data to prevent data leakage
              await clearAllUserData();

              // Navigate to the Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'OTPVerification' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout properly. Please try again.');
            }
          }
        }
      ]
    );
  };

  const menuItems: MenuItem[] = [
    { id: 1, title: 'History', icon: 'time-outline', color: defaultMenuIconColor, screen: 'History' },
    { id: 2, title: 'Insights', icon: 'bar-chart-outline', color: defaultMenuIconColor, screen: 'Insights' },
    { id: 3, title: 'My Contacts', icon: 'people-outline', color: defaultMenuIconColor, screen: 'MyContacts' },
    { id: 13, title: 'Customize Invoice', icon: 'color-palette-outline', color: defaultMenuIconColor, screen: 'InvoiceCustomization' },
    { id: 12, title: 'Settings', icon: 'settings-outline', color: defaultMenuIconColor, screen: 'Settings' },
    { id: 4, title: 'Notification', icon: 'notifications-outline', color: defaultMenuIconColor, screen: 'Notifications' },
    { id: 5, title: 'Payment Method', icon: 'card-outline', color: defaultMenuIconColor, screen: 'PaymentMethod' },
    // { id: 10, title: 'Tax and Discount', icon: 'pricetag-outline', color: defaultMenuIconColor, screen: 'TaxAndDiscount' },
    { id: 6, title: 'Export Center', icon: 'download-outline', color: defaultMenuIconColor, screen: 'ExportCenter' },
    { id: 11, title: 'Clear Storage', icon: 'trash-outline', color: defaultMenuIconColor, isClearStorage: true },
    { id: 7, title: 'Help & Support', icon: 'help-circle-outline', color: defaultMenuIconColor, screen: 'HelpSupport' },
    { id: 8, title: 'Rate us', icon: 'star-outline', color: defaultMenuIconColor, screen: 'RateUs' },
    { id: 9, title: 'Logout', icon: 'log-out-outline', color: '#F44336', isLogout: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../assets/Home3.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuVisible((prev) => !prev)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Header dropdown menu */}
      {isMenuVisible && (
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setIsMenuVisible(false);
                navigation.navigate('EditProfile');
              }}
            >
              <Ionicons name="create-outline" size={18} color="#333" />
              <Text style={styles.menuDropdownText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.businessLogo}>
              {shopDetails.profileImage ? (
                <Image
                  source={{ uri: shopDetails.profileImage }}
                  style={styles.profileImageStyle}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require('../assets/logo2.png')}
                  style={styles.businessLogoImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>
                {shopDetails.shopName}
              </Text>
              <Text style={styles.businessId}>
                {[shopDetails.city, shopDetails.state].filter(Boolean).join(' • ') || 'Business account'}
              </Text>
              {shopDetails.location && (
                <Text style={styles.businessLocation}>{shopDetails.location}</Text>
              )}
            </View>
          </View>
          {/* Visiting card disabled for now */}
          {/* <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate('VisitingCard')}
          >
            <Ionicons name="qr-code-outline" size={24} color="#333" />
          </TouchableOpacity> */}
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          {menuItems.map((item: MenuItem, index: number) => (
            <View key={item.id}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (item.isLogout) {
                    handleLogout();
                  } else if (item.isClearStorage) {
                    handleClearStorage();
                  } else if (item.screen) {
                    navigation.navigate(item.screen);
                  } else {
                    console.log(`${item.title} pressed`);
                  }
                }}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                  <Text style={[styles.menuText, item.isLogout && styles.logoutText]}>
                    {item.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Footer */}
      <Footer activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  logo: {
    width: 35,
    height: 35,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 35,
  },
  menuButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  businessLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E88E99',
  },
  businessLogoImage: {
    width: 30,
    height: 30,
  },
  profileImageStyle: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 3,
  },
  businessId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  businessLocation: {
    fontSize: 11,
    color: '#999',
  },
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    color: '#F44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
  },
  bottomSpacing: {
    height: 20,
  },
  menuOverlay: {
    position: 'absolute',
    top: 70,
    right: 10,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
    zIndex: 20,
  },
  menuDropdown: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 8,
  },
  menuDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
