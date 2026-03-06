import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import SyncIndicator from '../Components/SyncIndicator';
import { 
  getInvoices, 
  getPayments, 
  Payment,
  useNetworkStatus,
  getPendingSyncItems
} from '../utils/NetworkManager';

// Types and Interfaces
interface HistoryScreenProps {
  navigation: any;
}

type TabType = 'invoices' | 'payments';

interface ClientInfo {
  name: string;
  phone: string;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
}

interface Invoice {
  id: string;
  number: string;
  invoiceNumber: string;
  clientInfo: ClientInfo;
  total: number;
  items: InvoiceItem[];
  createdAt: string;
  status: string;
  additionalFees?: AdditionalFee[];
}

export default function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  // Network status monitoring
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>('payments'); // 'invoices' or 'payments'
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('amount-high-to-low');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerExpanded, setCustomerExpanded] = useState(false);
  const [tempSortOption, setTempSortOption] = useState('amount-high-to-low');
  const [tempSelectedCustomer, setTempSelectedCustomer] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    updatePendingSyncCount();
  }, []);

  // Update pending sync count
  const updatePendingSyncCount = async () => {
    try {
      const pendingItems = await getPendingSyncItems();
      setPendingSyncCount(pendingItems.length);
    } catch (error) {
      console.error('Error getting pending sync count:', error);
    }
  };

  // Monitor network status
  useEffect(() => {
    if (isConnected && isInternetReachable) {
      const checkSync = async () => {
        const pending = await getPendingSyncItems();
        if (pending.length > 0) {
          setIsSyncing(true);
          setTimeout(() => {
            setIsSyncing(false);
            updatePendingSyncCount();
          }, 3000);
        }
      };
      checkSync();
    }
  }, [isConnected, isInternetReachable]);

  const loadHistory = async (): Promise<void> => {
    try {
      const isOffline = !isConnected || !isInternetReachable;
      
      // Load invoices from backend (user-isolated, offline-capable)
      const invoiceList = await getInvoices();

      // Map backend invoice data to frontend format
      const mappedInvoices = invoiceList.map((inv: any) => ({
        id: inv._id,
        number: inv.invoiceNumber,
        invoiceNumber: inv.invoiceNumber,
        clientInfo: {
          name: inv.clientCustomerName || 'Unknown',
          phone: inv.clientCustomerPhone || ''
        },
        total: inv.totalAmount || 0,
        items: (inv.products || []).map((p: any) => ({
          name: p.itemName || 'Unknown Item',
          quantity: p.quantity || 0,
          price: p.costPerUnit || 0
        })),
        createdAt: inv.createdAt || inv.generatedAt,
        status: inv.isFinalized ? 'paid' : 'pending'
      }));

      setInvoices(mappedInvoices.reverse()); // Show newest first

      // Load payment history from backend (offline-capable)
      const paymentList = await getPayments();
      setPayments(paymentList.reverse());
      
      if (isOffline && (mappedInvoices.length > 0 || paymentList.length > 0)) {
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Showing cached data',
          position: 'bottom',
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load history',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleViewInvoice = async (invoice: Invoice): Promise<void> => {
    // Load shop details for businessInfo
    const shopDetailsStr = await AsyncStorage.getItem('@viveha_shop_details');
    let businessInfo = {
      name: 'My Shop',
      address: '',
      phone: '',
      email: '',
    };
    
    if (shopDetailsStr) {
      const details = JSON.parse(shopDetailsStr);
      businessInfo = {
        name: details.shopName || 'My Shop',
        address: `${details.location || ''}${details.city ? ', ' + details.city : ''}${details.state ? ', ' + details.state : ''}`,
        phone: details.mobile || '',
        email: '',
      };
    }

    // Cast to any to access dynamic properties
    const invoiceData = invoice as any;

    // Add businessInfo to invoice and ensure all financial breakdown fields are properly passed
    const invoiceWithBusinessInfo = {
      ...invoice,
      businessInfo,
      subtotal: invoiceData.subtotal || invoiceData.subTotal || 0,
      tax: invoiceData.tax || invoiceData.totalTax || 0,
      discount: invoiceData.discount || invoiceData.totalDiscount || 0,
      additionalFees: invoiceData.additionalFees || [],
      customCharges: invoiceData.customCharges || [],
    };

    navigation.navigate('InvoicePreview', { invoice: invoiceWithBusinessInfo, isPreview: false });
  };

  const getTotalInvoiceAmount = (): number => {
    return invoices.reduce((sum, inv) => sum + (parseFloat(String(inv.total)) || 0), 0);
  };

  const getTotalPaymentsAmount = (): number => {
    return payments.reduce((sum, pay) => sum + (parseFloat(String(pay.amount)) || 0), 0);
  };

  // Get unique customers from both invoices and payments
  const getUniqueCustomers = (): string[] => {
    const customers = new Set<string>();
    invoices.forEach(inv => {
      if (inv.clientInfo?.name) customers.add(inv.clientInfo.name);
    });
    payments.forEach(pay => {
      if (pay.clientName) customers.add(pay.clientName);
    });
    return Array.from(customers).sort();
  };

  // Apply filters function
  const applyFilters = () => {
    setSortOption(tempSortOption);
    setSelectedCustomer(tempSelectedCustomer);
    setFilterModalVisible(false);
  };

  // Reset filters function
  const resetFilters = () => {
    setTempSortOption('amount-high-to-low');
    setTempSelectedCustomer(null);
  };

  // Get filtered and sorted data
  const getFilteredData = (): (Invoice | Payment)[] => {
    let data: (Invoice | Payment)[] = activeTab === 'invoices' ? [...invoices] : [...payments];
    
    // Filter by customer
    if (selectedCustomer) {
      if (activeTab === 'invoices') {
        data = (data as Invoice[]).filter((item) => item.clientInfo?.name === selectedCustomer);
      } else {
        data = (data as Payment[]).filter((item) => item.clientName === selectedCustomer);
      }
    }
    
    // Sort data
    switch (sortOption) {
      case 'amount-high-to-low':
        data.sort((a: any, b: any) => {
          const amountA = parseFloat(String(a.total || a.amount || 0));
          const amountB = parseFloat(String(b.total || b.amount || 0));
          return amountB - amountA;
        });
        break;
      case 'amount-low-to-high':
        data.sort((a: any, b: any) => {
          const amountA = parseFloat(String(a.total || a.amount || 0));
          const amountB = parseFloat(String(b.total || b.amount || 0));
          return amountA - amountB;
        });
        break;
      case 'date-newest':
        data.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'date-oldest':
        data.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateA - dateB;
        });
        break;
    }
    
    return data;
  };

  const filteredData = getFilteredData();
  const uniqueCustomers = getUniqueCustomers();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sync Indicator */}
      <SyncIndicator 
        isSyncing={isSyncing}
        isOnline={isConnected && isInternetReachable}
        pendingCount={pendingSyncCount}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setTempSortOption(sortOption);
            setTempSelectedCustomer(selectedCustomer);
            setFilterModalVisible(true);
          }}
        >
          <Ionicons name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      {/* Tab Selector - Disabled as per request
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
          onPress={() => setActiveTab('invoices')}
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color={activeTab === 'invoices' ? '#FF6B6B' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
            Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}
        >
          <Ionicons
            name="cash-outline"
            size={20}
            color={activeTab === 'payments' ? '#FF6B6B' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
            Payments ({payments.length})
          </Text>
        </TouchableOpacity>
      </View>
      */}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>
            {activeTab === 'invoices' ? 'Total Invoiced' : 'Total Received'}
          </Text>
          <Text style={styles.summaryAmount}>
            Rs.{activeTab === 'invoices' ? getTotalInvoiceAmount().toFixed(2) : getTotalPaymentsAmount().toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>
            {activeTab === 'invoices' ? 'Invoices' : 'Transactions'}
          </Text>
          <Text style={styles.summaryCount}>
            {activeTab === 'invoices' ? invoices.length : payments.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Invoice History */}
        {/* Invoice History */}
        {activeTab === 'invoices' && (
          <View style={styles.historySection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E88E99" />
                <Text style={styles.loadingText}>Loading invoices...</Text>
              </View>
            ) : filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={"receipt-outline" as any} size={60} color="#ccc" />
                <Text style={styles.emptyText}>No invoices found</Text>
                <Text style={styles.emptySubtext}>{selectedCustomer ? 'Try adjusting your filters' : 'Create your first invoice to see it here'}</Text>
              </View>
            ) : (
              (filteredData as Invoice[]).map((invoice, index) => (
                <TouchableOpacity
                  key={invoice.id || index}
                  style={styles.historyCard}
                  onPress={() => handleViewInvoice(invoice)}
                >
                  <View style={styles.historyCardLeft}>
                    <View style={styles.iconCircle}>
                      <Ionicons name={"document-text" as any} size={20} color="#4A90E2" />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>{invoice.number}</Text>
                      <Text style={styles.historyClient}>
                        {invoice.clientInfo?.name || 'N/A'}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(invoice.createdAt).toLocaleDateString()} • {new Date(invoice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyCardRight}>
                    <Text style={styles.historyAmount}>Rs.{invoice.total?.toFixed(2) || '0.00'}</Text>
                    <View style={styles.itemsBadge}>
                      <Text style={styles.itemsBadgeText}>{invoice.items?.length || 0} items</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Payment History */}
        {activeTab === 'payments' && (
          <View style={styles.historySection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E88E99" />
                <Text style={styles.loadingText}>Loading payments...</Text>
              </View>
            ) : filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={"cash-outline" as any} size={60} color="#ccc" />
                <Text style={styles.emptyText}>No payments found</Text>
                <Text style={styles.emptySubtext}>{selectedCustomer ? 'Try adjusting your filters' : 'Received payments will appear here'}</Text>
              </View>
            ) : (
              (filteredData as Payment[]).map((payment, index) => (
                <View key={payment.id || index} style={styles.historyCard}>
                  <View style={styles.historyCardLeft}>
                    <View style={[styles.iconCircle, styles.iconCircleGreen]}>
                      <Ionicons name={"checkmark-circle" as any} size={20} color="#4CAF50" />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>{payment.invoiceNumber}</Text>
                      <Text style={styles.historyClient}>{payment.clientName}</Text>
                      <Text style={styles.historyDate}>
                        {payment.date} • {payment.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyCardRight}>
                    <Text style={[styles.historyAmount, styles.historyAmountGreen]}>
                      Rs.{payment.amount?.toFixed(2) || '0.00'}
                    </Text>
                    <View style={[styles.statusBadge, payment.paymentType === 'partial' && styles.statusBadgePartial]}>
                      <Text style={styles.statusBadgeText}>
                        {payment.paymentType === 'partial' ? 'Partial' : 'Full'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sort & Filter</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Sort By Section */}
              <Text style={styles.sectionLabel}>SORT BY</Text>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTempSortOption('amount-high-to-low')}
              >
                <Text style={styles.radioLabel}>Amount: High to low</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'amount-high-to-low' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTempSortOption('amount-low-to-high')}
              >
                <Text style={styles.radioLabel}>Amount: Low to High</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'amount-low-to-high' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTempSortOption('date-newest')}
              >
                <Text style={styles.radioLabel}>Date: Newest First</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'date-newest' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTempSortOption('date-oldest')}
              >
                <Text style={styles.radioLabel}>Date: Oldest First</Text>
                <View style={styles.radioButton}>
                  {tempSortOption === 'date-oldest' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Customer Section */}
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

              {customerExpanded && uniqueCustomers.map((customer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.radioOption}
                  onPress={() => setTempSelectedCustomer(tempSelectedCustomer === customer ? null : customer)}
                >
                  <Text style={styles.radioLabel}>{customer}</Text>
                  <View style={styles.radioButton}>
                    {tempSelectedCustomer === customer && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
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
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#E46269',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#E46269',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleGreen: {
    backgroundColor: '#E8F5E9',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  historyClient: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#999',
  },
  historyCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
  },
  historyAmountGreen: {
    color: '#4CAF50',
  },
  itemsBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemsBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePartial: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  filterButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '85%',
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
    paddingTop: 20,
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
    paddingHorizontal: 4,
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
