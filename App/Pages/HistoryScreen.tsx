import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import SyncIndicator from '../Components/SyncIndicator';
import Footer from '../Components/Footer';
import {
  getInvoices,
  getPayments,
  getDashboardSummary,
  type DashboardSummary,
  type Payment,
  useNetworkStatus,
  getPendingSyncItems,
} from '../utils/NetworkManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HistoryScreenProps {
  navigation: any;
}

interface InvoiceFromBackend {
  id?: string;
  _id?: string;
  invoiceNumber?: string;
  number?: string;
  clientInfo?: { name?: string; phone?: string };
  clientCustomerName?: string;
  clientName?: string;
  total?: number;
  totalAmount?: number;
  createdAt?: string;
  generatedAt?: string;
  items?: any[];
}

type TabType = 'invoices' | 'payments';

interface TransactionRow {
  id: string;
  type: 'invoice' | 'payment';
  title: string;
  dateTime: string;
  amount: number;
  isIncoming: boolean;
  secondary: string;
  sortDate: Date;
}

function formatRecentDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (dDate.getTime() === today.getTime()) return `Today, ${timeStr}`;
  if (dDate.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString()}, ${timeStr}`;
}

function formatCurrency(value: number): string {
  const n = Math.abs(value);
  const s = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Rs.${s}`;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceFromBackend[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('date-newest');
  const [tempSortOption, setTempSortOption] = useState('date-newest');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [tempSelectedCustomer, setTempSelectedCustomer] = useState<string | null>(null);
  const [customerExpanded, setCustomerExpanded] = useState(false);

  const updatePendingSyncCount = useCallback(async () => {
    try {
      const pending = await getPendingSyncItems();
      setPendingSyncCount(pending.length);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, invoiceList, paymentList] = await Promise.all([
        getDashboardSummary(),
        getInvoices(),
        getPayments(),
      ]);

      if (summaryRes) setSummary(summaryRes);
      setInvoices((invoiceList || []) as InvoiceFromBackend[]);
      setPayments(paymentList || []);

      const rows: TransactionRow[] = [];
      const invList = (invoiceList || []) as InvoiceFromBackend[];

      invList.forEach((inv) => {
        const rawDate = inv.createdAt || inv.generatedAt || new Date().toISOString();
        const sortDate = new Date(rawDate);
        const total = Number(inv.total ?? inv.totalAmount ?? 0);
        const invNum = inv.invoiceNumber || inv.number || inv.id || inv._id || '—';
        rows.push({
          id: `inv-${inv.id || inv._id}`,
          type: 'invoice',
          title: `Invoice ${invNum}`,
          dateTime: formatRecentDate(sortDate),
          amount: total,
          isIncoming: false,
          secondary: `Bill No.: ${invNum}`,
          sortDate,
        });
      });

      (paymentList || []).forEach((pay: Payment) => {
        const rawDate = pay.createdAt || pay.paidAt || pay.recordedAt || new Date().toISOString();
        const sortDate = new Date(rawDate);
        const amount = Number(pay.amount ?? 0);
        const clientName = pay.clientName || 'Party';
        const invNum = pay.invoiceNumber || '';
        rows.push({
          id: `pay-${pay.id}`,
          type: 'payment',
          title: clientName,
          dateTime: formatRecentDate(sortDate),
          amount,
          isIncoming: true,
          secondary: invNum ? `Invoice-${invNum}` : 'PAID',
          sortDate,
        });
      });

      rows.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
      setTransactions(rows);
    } catch (error) {
      console.error('Error loading history:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load transaction history',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    updatePendingSyncCount();
  }, [loadData, updatePendingSyncCount]);

  useEffect(() => {
    if (isConnected && isInternetReachable) {
      getPendingSyncItems().then((pending) => {
        if (pending.length > 0) {
          setIsSyncing(true);
          setTimeout(() => {
            setIsSyncing(false);
            updatePendingSyncCount();
          }, 2000);
        }
      });
    }
  }, [isConnected, isInternetReachable, updatePendingSyncCount]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await updatePendingSyncCount();
    setRefreshing(false);
  };

  const getUniqueCustomers = (): string[] => {
    const names = new Set<string>();
    transactions.forEach((row) => {
      if (row.type === 'payment' && row.title && row.title !== 'Party') names.add(row.title);
    });
    return Array.from(names).sort();
  };

  const applyFilters = () => {
    setSortOption(tempSortOption);
    setSelectedCustomer(tempSelectedCustomer);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempSortOption('date-newest');
    setTempSelectedCustomer(null);
  };

  const getSortedTransactions = (): TransactionRow[] => {
    let list = [...transactions];
    if (selectedCustomer) {
      list = list.filter((row) => row.type === 'payment' && row.title === selectedCustomer);
    }
    switch (sortOption) {
      case 'amount-high-to-low':
        return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      case 'amount-low-to-high':
        return list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
      case 'date-oldest':
        return list.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
      default:
        return list.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    }
  };

  const sortedTransactions = getSortedTransactions();
  const uniqueCustomers = getUniqueCustomers();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SyncIndicator
        isSyncing={isSyncing}
        isOnline={isConnected && isInternetReachable}
        pendingCount={pendingSyncCount}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setTempSortOption(sortOption);
            setTempSelectedCustomer(selectedCustomer);
            setFilterModalVisible(true);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Top summary card - red-to-pink gradient */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>TOTAL VALUE</Text>
          <Text style={styles.summaryAmount}>
            {summary ? formatCurrency(summary.totalRevenue) : 'Rs.0.00'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRight}>
          <Text style={styles.summaryLabel}>PAYABLE</Text>
          <Text style={styles.summaryAmount}>
            {summary ? formatCurrency(summary.pendingAmount) : 'Rs.0.00'}
          </Text>
        </View>
      </View>

      {/* Recent Transactions section */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E46269" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E46269" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : sortedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Invoices and payments will appear here</Text>
          </View>
        ) : (
          sortedTransactions.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, row.isIncoming ? styles.iconCircleGreen : styles.iconCircleBlue]}>
                  <Ionicons name="checkmark" size={22} color={row.isIncoming ? '#2E7D32' : '#4A90E2'} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.cardDate}>{row.dateTime}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, row.isIncoming ? styles.amountGreen : styles.amountRed]}>
                  {row.isIncoming ? '+' : '-'}{formatCurrency(row.amount)}
                </Text>
                <Text style={[styles.cardSecondary, row.secondary === 'PAID' && styles.secondaryPaid]}>
                  {row.secondary}
                </Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>


      {/* Bottom navigation */}
      <Footer activeTab="Home" navigation={navigation} />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sort & Filter</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>SORT BY</Text>
              <TouchableOpacity style={styles.radioOption} onPress={() => setTempSortOption('amount-high-to-low')}>
                <Text style={styles.radioLabel}>Amount: High to low</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'amount-high-to-low' && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => setTempSortOption('amount-low-to-high')}>
                <Text style={styles.radioLabel}>Amount: Low to High</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'amount-low-to-high' && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => setTempSortOption('date-newest')}>
                <Text style={styles.radioLabel}>Date: Newest First</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'date-newest' && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => setTempSortOption('date-oldest')}>
                <Text style={styles.radioLabel}>Date: Oldest First</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'date-oldest' && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setCustomerExpanded(!customerExpanded)}
              >
                <Text style={styles.sectionLabel}>CUSTOMER</Text>
                <Ionicons
                  name={customerExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {customerExpanded && uniqueCustomers.map((customer) => (
                <TouchableOpacity
                  key={customer}
                  style={styles.radioOption}
                  onPress={() => setTempSelectedCustomer(tempSelectedCustomer === customer ? null : customer)}
                >
                  <Text style={styles.radioLabel}>{customer}</Text>
                  <View style={styles.radioButton}>
                    {tempSelectedCustomer === customer && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 12,
    paddingBottom: 12,
   
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E46269',
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: '#E46269',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleGreen: {
    backgroundColor: '#E8F5E9',
  },
  iconCircleBlue: {
    backgroundColor: '#E3F2FD',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  amountGreen: {
    color: '#2E7D32',
  },
  amountRed: {
    color: '#C62828',
  },
  cardSecondary: {
    fontSize: 11,
    color: '#666',
  },
  secondaryPaid: {
    color: '#E57373',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 88,
    left: (SCREEN_WIDTH - 56) / 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E46269',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  resetText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  radioLabel: {
    fontSize: 15,
    color: '#000',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E46269',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E46269',
  },
  applyButton: {
    backgroundColor: '#FF7A59',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
