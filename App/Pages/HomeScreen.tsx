import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../Components/Footer';
import { fetchAllUserData, getInvoices, getPayments, getPendingInvoices, Payment } from '../utils/NetworkManager';

// Type definitions
interface HomeScreenProps {
  navigation: any; // You can replace with proper navigation type from @react-navigation/native
}

interface Transaction {
  id: string;
  rawDate: Date;
  name: string;
  type: string;
  time: string;
  amount: string;
  invoice: string;
  isPositive: boolean;
  avatar: string;
  icon: string;
  color: string;
  bgColor: string;
}

interface QuickLink {
  id: number;
  title: string;
  icon: string;
  screen: string;
}

interface ShopDetails {
  shopName?: string;
}

interface Invoice {
  pendingAmount?: number;
  amount?: number;
}

export default function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const [shopName, setShopName] = useState<string>('My Shop');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(true);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadShopDetails();
      loadUserData();
      loadRecentTransactions();
      loadBalance();
    }, [])
  );

  const loadUserData = async (): Promise<void> => {
    try {
      setIsLoadingData(true);
      // Fetch all user-specific data from backend
      await fetchAllUserData();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadShopDetails = async (): Promise<void> => {
    try {
      const shopDetails = await AsyncStorage.getItem('@viveha_shop_details');
      if (shopDetails) {
        const details: ShopDetails = JSON.parse(shopDetails);
        setShopName(details.shopName || 'My Shop');
      }
    } catch (error) {
      console.error('Error loading shop details:', error);
    }
  };

  const loadBalance = async (): Promise<void> => {
    try {
      const pendingInvoices: Invoice[] = await getPendingInvoices();
      if (Array.isArray(pendingInvoices)) {
        const total = pendingInvoices.reduce((sum: number, inv: Invoice) => {
          // Calculate pending amount correctly
          const pendingAmount = parseFloat(String(inv.pendingAmount || inv.amount || 0));
          return sum + (isNaN(pendingAmount) ? 0 : pendingAmount);
        }, 0);
        setBalance(total);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const toggleBalanceVisibility = (): void => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const loadRecentTransactions = async (): Promise<void> => {
    try {
      setIsTransactionsLoading(true);
      setTransactions([]); // Clear previous transactions before loading new ones

      // Fetch only payments
      const paymentList: Payment[] = await getPayments();

      const allTransactions: Transaction[] = [];

      // Process Payments
      paymentList.forEach((pay: Payment) => {
        // Use createdAt for sorting, fall back to date+time string
        const dateStr = pay.createdAt || `${pay.date} ${pay.time}`;
        const rawDate = new Date(dateStr);

        allTransactions.push({
          id: pay.id || `pay_${Math.random()}`, // Ensure unique ID
          rawDate: isNaN(rawDate.getTime()) ? new Date() : rawDate,
          name: pay.clientName || 'Unknown',
          type: 'Payment',
          time: `${pay.date} ${pay.time}`,
          amount: `Rs.${(pay.amount || 0).toFixed(2)}`,
          invoice: pay.invoiceNumber || 'N/A',
          isPositive: true,
          avatar: '💰',
          icon: 'checkmark-circle',
          color: '#4CAF50', // Green for Payment
          bgColor: '#E8F5E9'
        });
      });

      // Sort by date descending (newest first)
      allTransactions.sort((a: Transaction, b: Transaction) => {
        const dateA = a.rawDate instanceof Date && !isNaN(a.rawDate.getTime()) ? a.rawDate : new Date(0);
        const dateB = b.rawDate instanceof Date && !isNaN(b.rawDate.getTime()) ? b.rawDate : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Show only the 5 most recent transactions
      setTransactions(allTransactions.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      setTransactions([]);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    { id: 1, title: 'Create Invoice', icon: 'document-text-outline', screen: 'CreateInvoice' },
    { id: 2, title: 'Pendings', icon: 'time-outline', screen: 'Pendings' },
    { id: 3, title: 'Insights', icon: 'stats-chart-outline', screen: 'Insights' },
    { id: 4, title: 'Items', icon: 'grid-outline', screen: 'Items' },
  ];

  const handleQuickLinkPress = (screen: string): void => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <LinearGradient
          colors={['#E88E99', '#E88E99']}
          style={styles.headerCard}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.greeting}>Good Morning!</Text>
                <Text style={styles.businessName}>{shopName.toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceSection}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <TouchableOpacity onPress={toggleBalanceVisibility}>
                <Ionicons
                  name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {isBalanceVisible
                ? `Rs.${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'Rs. ****'}
            </Text>
          </View>

          {/* Quick Links */}
          <View style={styles.quickLinksCard}>
            <Text style={styles.quickLinksTitle}>Quick Links</Text>
            <View style={styles.quickLinksGrid}>
              {quickLinks.map((link: QuickLink) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.quickLinkButton}
                  onPress={() => handleQuickLinkPress(link.screen)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickLinkIcon}>
                    <Ionicons name={link.icon as any} size={24} color="#E88E99" />
                  </View>
                  <Text style={styles.quickLinkText}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Invite Card */}
        <LinearGradient
          colors={['#E88E99', '#E88E99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.inviteCard}
        >
          <View style={styles.inviteContent}>
            <Text style={styles.inviteTitle}>Invite a friend and</Text>
            <Text style={styles.inviteTitle}>both earn Offers</Text>
            <TouchableOpacity style={styles.inviteButton}>
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Image
            source={require('../assets/logo.png')}
            style={styles.inviteLogo}
            resizeMode="contain"
          />
        </LinearGradient>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isTransactionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E88E99" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((transaction: Transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.avatar, { backgroundColor: transaction.bgColor || '#FFF3E0' }]}>
                    {transaction.icon ? (
                      <Ionicons name={transaction.icon as any} size={24} color={transaction.color} />
                    ) : (
                      <Text style={styles.avatarText}>{transaction.avatar}</Text>
                    )}
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionName}>{transaction.name}</Text>
                    <Text style={styles.transactionTime}>
                      {transaction.type} • {transaction.time}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.color }
                    ]}
                  >
                    {transaction.amount}
                  </Text>
                  <Text style={styles.transactionInvoice}>{transaction.invoice}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Footer */}
      <Footer activeTab="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 20,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSection: {
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  quickLinksCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 20,
  },
  quickLinksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLinkButton: {
    alignItems: 'center',
    gap: 8,
  },
  quickLinkIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  inviteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  inviteContent: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  inviteLogo: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6B8EFF',
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#F44336',
  },
  transactionInvoice: {
    fontSize: 11,
    color: '#999',
  }, emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  }, bottomSpacing: {
    height: 20,
  },
});
