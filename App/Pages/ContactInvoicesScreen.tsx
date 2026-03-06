import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SyncIndicator from '../Components/SyncIndicator';
import {
  getInvoices,
  getInvoicePayments,
  useNetworkStatus,
  getPendingSyncItems,
} from '../utils/NetworkManager';

interface Product {
  itemName: string;
  quantity: number;
  costPerUnit?: number;
  price?: number;
}

interface InvoiceItem {
  id?: string;
  serverId?: string;
  name: string;
  quantity: number;
  unit: string;
  actualPrice?: number;
  salePrice: number;
  price: number;
  tax: number;
  discount: number;
  stockAvailable?: number;
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceId: string;
  serverId?: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  date: string;
  time: string;
  dueDate?: string;
  invoiceDate?: string;
  items: InvoiceItem[];
  products: Product[];
  createdAt?: string;
  additionalFees?: AdditionalFee[];
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  method?: string;
  paymentMethod?: string;
  date: string;
  time: string;
  note?: string;
  paidAt?: string;
  createdAt?: string;
}

interface ContactInvoicesScreenProps {
  navigation: any;
  route: any;
}

type FilterType = 'all' | 'paid' | 'pending' | 'unpaid';

export default function ContactInvoicesScreen({ navigation, route }: ContactInvoicesScreenProps): React.JSX.Element {
  const { contact } = route.params;
  
  // Network status
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadInvoices();
    updatePendingSyncCount();
  }, []);

  const updatePendingSyncCount = async () => {
    try {
      const pendingItems = await getPendingSyncItems();
      setPendingSyncCount(pendingItems.length);
    } catch (error) {
      console.error('Error getting pending sync count:', error);
    }
  };

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

  const loadInvoices = async (): Promise<void> => {
    try {
      setLoading(true);
      const isOffline = !isConnected || !isInternetReachable;
      
      const allInvoices = await getInvoices();

      // Filter invoices for this contact
      const contactInvoices = allInvoices
        .filter((inv: any) => {
          const matchesPhone = inv.clientCustomerPhone === contact.phone || inv.clientPhone === contact.phone;
          const matchesName = inv.clientCustomerName === contact.name || inv.clientName === contact.name;
          return matchesPhone || matchesName;
        })
        .map((inv: any) => {
          const invoiceId = inv._id || inv.id;
          const invoiceIdStr = String(invoiceId);
          const shortId = invoiceIdStr.length > 6 ? invoiceIdStr.slice(-6) : invoiceIdStr;

          const totalAmount = parseFloat(inv.totalAmount || inv.grandTotal || inv.total || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || (totalAmount - paidAmount));

          const items = (inv.products || []).map((product: Product) => ({
            name: product.itemName || 'Unknown Item',
            quantity: product.quantity || 0,
            price: product.costPerUnit || product.price || 0,
          }));

          return {
            id: invoiceId,
            invoiceId: invoiceId,
            serverId: inv._id || inv.serverId,
            invoiceNumber: inv.invoiceNumber || `INV-${shortId}`,
            clientName: inv.clientCustomerName || inv.clientName || contact.name,
            clientPhone: inv.clientCustomerPhone || inv.clientPhone || contact.phone,
            amount: pendingAmount,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            status: inv.status || (pendingAmount > 0 ? 'pending' : 'paid'),
            date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            dueDate: inv.dueDate,
            invoiceDate: inv.invoiceDate,
            items: items,
            products: inv.products || [],
            createdAt: inv.createdAt,
          };
        })
        .reverse(); // Show newest first

      setInvoices(contactInvoices);
      
      if (isOffline && contactInvoices.length > 0) {
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Showing cached invoices',
          position: 'bottom',
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load invoices',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = (): number => {
    return invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  };

  const getTotalPaid = (): number => {
    return invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  };

  const getTotalPending = (): number => {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getPaidInvoicesCount = (): number => {
    return invoices.filter(inv => inv.amount <= 0 || inv.status === 'paid').length;
  };

  const getPendingInvoicesCount = (): number => {
    return invoices.filter(inv => inv.amount > 0 && inv.status !== 'paid').length;
  };

  const getUnpaidInvoicesCount = (): number => {
    return invoices.filter(inv => inv.paidAmount === 0).length;
  };

  const getFilteredInvoices = (): Invoice[] => {
    switch (activeFilter) {
      case 'paid':
        return invoices.filter(inv => inv.amount <= 0 || inv.status === 'paid');
      case 'pending':
        return invoices.filter(inv => inv.amount > 0 && inv.paidAmount > 0 && inv.status !== 'paid');
      case 'unpaid':
        return invoices.filter(inv => inv.paidAmount === 0);
      case 'all':
      default:
        return invoices;
    }
  };

  const handleShowPaymentHistory = async (invoice: Invoice): Promise<void> => {
    try {
      setLoadingHistory(true);
      setSelectedInvoice(invoice);
      setPaymentHistoryModalVisible(true);

      // Fetch payment history for this invoice
      const payments = await getInvoicePayments(invoice.invoiceId);
      
      console.log('📜 Payment history for invoice:', invoice.invoiceId, payments);
      
      // Map payments to PaymentHistoryItem format
      const mappedPayments: PaymentHistoryItem[] = payments.map(payment => ({
        id: payment.id || '',
        amount: payment.amount || 0,
        method: payment.method,
        paymentMethod: payment.paymentMethod,
        date: payment.date || '',
        time: payment.time || '',
        note: payment.note,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      }));
      
      // Sort payments by timestamp (oldest first for Bill 1, Bill 2...)
      const sortedPayments = mappedPayments.sort((a, b) => {
        const timeA = new Date(a.paidAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.paidAt || b.createdAt || 0).getTime();
        return timeA - timeB; // Ascending order: oldest payment = Bill 1
      });
      
      setPaymentHistory(sortedPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load payment history',
        position: 'bottom',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice): Promise<void> => {
    try {
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

      const allInvoices = await getInvoices();

      let fullInvoice = allInvoices.find((inv: any) =>
        inv.id === invoice.invoiceId ||
        inv._id === invoice.invoiceId ||
        inv.serverId === invoice.serverId
      );

      if (!fullInvoice) {
        fullInvoice = allInvoices.find((inv: any) =>
          inv.number === invoice.invoiceNumber ||
          inv.invoiceNumber === invoice.invoiceNumber
        );
      }

      if (!fullInvoice && invoice) {
        const invoiceData = invoice as any;
        const items = invoiceData.items || (invoiceData.products || []).map((product: Product) => ({
          name: product.itemName || 'Unknown Item',
          quantity: product.quantity || 0,
          price: product.costPerUnit || product.price || 0,
          salePrice: product.costPerUnit || product.price || 0,
          unit: 'unit',
          tax: 0,
          discount: 0,
        }));

        fullInvoice = {
          id: invoice.invoiceId,
          serverId: invoice.serverId,
          number: invoice.invoiceNumber,
          invoiceNumber: invoice.invoiceNumber,
          businessInfo: businessInfo,
          clientInfo: {
            name: invoice.clientName,
            phone: invoice.clientPhone,
          },
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          total: invoice.totalAmount,
          grandTotal: invoice.totalAmount,
          subTotal: invoiceData.subtotal || invoiceData.subTotal || 0,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          pendingAmount: invoice.amount,
          discount: invoiceData.discount || invoiceData.totalDiscount || 0,
          tax: invoiceData.tax || invoiceData.totalTax || 0,
          status: invoice.status,
          invoiceDate: invoice.invoiceDate || invoice.date,
          dueDate: invoice.dueDate || invoice.date,
          items: items,
          createdAt: invoice.createdAt,
          additionalFees: invoiceData.additionalFees || [],
          customCharges: invoiceData.customCharges || [],
        } as any;
      }

      if (fullInvoice) {
        navigation.navigate('InvoicePreview', { invoice: fullInvoice, isPreview: false });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Invoice not found',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load invoice',
        position: 'bottom',
      });
    }
  };

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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{contact.name}</Text>
          <Text style={styles.headerSubtitle}>{contact.phone}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.totalCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <View style={styles.totalIcon}>
                <Ionicons name={"receipt-outline" as any} size={16} color="#4A90E2" />
              </View>
            </View>
            <Text style={styles.summaryNumber}>Rs.{getTotalAmount().toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={[styles.summaryCard, styles.paidCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <View style={styles.paidIcon}>
                <Ionicons name={"checkmark-circle-outline" as any} size={16} color="#4CAF50" />
              </View>
            </View>
            <Text style={styles.summaryNumber}>Rs.{getTotalPaid().toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>{getPaidInvoicesCount()} paid</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.pendingCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Total Pending</Text>
              <View style={styles.pendingIcon}>
                <Ionicons name={"time-outline" as any} size={16} color="#FF9800" />
              </View>
            </View>
            <Text style={styles.summaryNumber}>Rs.{getTotalPending().toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>{getPendingInvoicesCount()} pending</Text>
          </View>

          <View style={[styles.summaryCard, styles.invoiceSummaryCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Latest Invoice</Text>
              <View style={styles.invoiceIcon}>
                <Ionicons name={"document-text-outline" as any} size={16} color="#9C27B0" />
              </View>
            </View>
            <Text style={styles.summaryNumber}>{invoices.length > 0 ? invoices[0].date : 'N/A'}</Text>
            <Text style={styles.summarySubtext}>{invoices.length > 0 ? invoices[0].invoiceNumber : '-'}</Text>
          </View>
        </View>

        {/* Invoices List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Invoices</Text>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                All ({invoices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'paid' && styles.filterTabActive]}
              onPress={() => setActiveFilter('paid')}
            >
              <Text style={[styles.filterTabText, activeFilter === 'paid' && styles.filterTabTextActive]}>
                Paid ({getPaidInvoicesCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'pending' && styles.filterTabActive]}
              onPress={() => setActiveFilter('pending')}
            >
              <Text style={[styles.filterTabText, activeFilter === 'pending' && styles.filterTabTextActive]}>
                Pending ({getPendingInvoicesCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'unpaid' && styles.filterTabActive]}
              onPress={() => setActiveFilter('unpaid')}
            >
              <Text style={[styles.filterTabText, activeFilter === 'unpaid' && styles.filterTabTextActive]}>
                Unpaid ({getUnpaidInvoicesCount()})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E88E99" />
              <Text style={styles.loadingText}>Loading invoices...</Text>
            </View>
          ) : getFilteredInvoices().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name={"receipt-outline" as any} size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeFilter === 'all' ? 'No invoices found' : `No ${activeFilter} invoices`}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === 'all' ? 'This contact has no invoices yet' : `No invoices match the selected filter`}
              </Text>
            </View>
          ) : (
            getFilteredInvoices().map((invoice) => {
              const paymentPercentage = invoice.totalAmount > 0 ? (invoice.paidAmount / invoice.totalAmount) * 100 : 0;
              const isPaid = invoice.amount <= 0 || invoice.status === 'paid';

              return (
                <View key={invoice.id} style={styles.invoiceCard}>
                  {/* Invoice Header */}
                  <View style={styles.invoiceHeader}>
                    <View style={styles.invoiceLeft}>
                      <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                      <Text style={styles.invoiceDate}>{invoice.date} • {invoice.time}</Text>
                    </View>
                    <View style={styles.invoiceRight}>
                      <Text style={styles.invoiceAmount}>Rs.{invoice.totalAmount.toFixed(2)}</Text>
                      <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusPending]}>
                        <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Payment Progress */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${paymentPercentage}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {paymentPercentage.toFixed(0)}% paid • Rs.{invoice.paidAmount.toFixed(2)} / Rs.{invoice.totalAmount.toFixed(2)}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.invoiceActions}>
                    <TouchableOpacity
                      style={styles.viewInvoiceButton}
                      onPress={() => handleViewInvoice(invoice)}
                    >
                      <Ionicons name={"document-text-outline" as any} size={18} color="#4A90E2" />
                      <Text style={styles.viewInvoiceText}>View Invoice</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.paymentHistoryButton}
                      onPress={() => navigation.navigate('CustomerProfile', {
                        customerId: contact.id,
                        customerName: contact.name
                      })}
                    >
                      <Ionicons name={"time-outline" as any} size={18} color="#666" />
                      <Text style={styles.paymentHistoryText}>Payment History</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Payment History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentHistoryModalVisible}
        onRequestClose={() => setPaymentHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedInvoice && (
              <View>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Payment History</Text>
                    <Text style={styles.modalSubtitle}>{selectedInvoice.invoiceNumber}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPaymentHistoryModalVisible(false)}>
                    <Ionicons name={"close" as any} size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.historyInfoCard}>
                  <Text style={styles.historyInfoLabel}>Invoice Total</Text>
                  <Text style={styles.historyInfoAmount}>Rs.{selectedInvoice.totalAmount.toFixed(2)}</Text>
                  <View style={styles.historyInfoRow}>
                    <View style={styles.historyInfoItem}>
                      <Text style={styles.historyInfoItemLabel}>Paid</Text>
                      <Text style={styles.historyInfoItemValue}>Rs.{selectedInvoice.paidAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.historyInfoItem}>
                      <Text style={styles.historyInfoItemLabel}>Pending</Text>
                      <Text style={styles.historyInfoItemValuePending}>Rs.{selectedInvoice.amount.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                {loadingHistory ? (
                  <View style={styles.historyLoadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.historyLoadingText}>Loading payment history...</Text>
                  </View>
                ) : paymentHistory.length === 0 ? (
                  <View style={styles.historyEmptyState}>
                    <Ionicons name={"receipt-outline" as any} size={50} color="#ccc" />
                    <Text style={styles.historyEmptyText}>No payment history</Text>
                    <Text style={styles.historyEmptySubtext}>No payments have been made for this invoice yet</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.historyScrollView} showsVerticalScrollIndicator={false}>
                    {paymentHistory.map((payment, index) => (
                      <View key={payment.id || index} style={styles.paymentHistoryItem}>
                        <View style={styles.paymentHistoryLeft}>
                          <View style={styles.paymentIconContainer}>
                            <Ionicons 
                              name={
                                payment.method === 'cash' || payment.paymentMethod === 'cash' ? "cash-outline" :
                                payment.method === 'card' || payment.paymentMethod === 'card' ? "card-outline" :
                                payment.method === 'upi' || payment.paymentMethod === 'upi' ? "phone-portrait-outline" :
                                payment.method === 'bank' || payment.paymentMethod === 'bank' ? "business-outline" :
                                "wallet-outline" as any
                              } 
                              size={22} 
                              color="#4CAF50" 
                            />
                          </View>
                          <View style={styles.paymentHistoryInfo}>
                            <Text style={styles.paymentBillNumber}>Bill {index + 1}</Text>
                            <Text style={styles.paymentHistoryAmount}>Rs.{payment.amount.toFixed(2)}</Text>
                            <Text style={styles.paymentHistoryMethod}>
                              {(payment.method || payment.paymentMethod || 'cash').toUpperCase()}
                            </Text>
                            {payment.note && (
                              <Text style={styles.paymentHistoryNote}>{payment.note}</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.paymentHistoryRight}>
                          <Text style={styles.paymentHistoryDate}>{payment.date}</Text>
                          <Text style={styles.paymentHistoryTime}>{payment.time}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  paidCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  invoiceSummaryCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  totalIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3E5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#999',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC143C',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterTabActive: {
    backgroundColor: '#E88E99',
    borderColor: '#E88E99',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#666',
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextPaid: {
    color: '#4CAF50',
  },
  statusTextPending: {
    color: '#FF9800',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewInvoiceButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
  },
  viewInvoiceText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentHistoryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentHistoryText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  historyInfoCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  historyInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyInfoAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 12,
  },
  historyInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  historyInfoItem: {
    flex: 1,
  },
  historyInfoItemLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  historyInfoItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  historyInfoItemValuePending: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  historyLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  historyEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  historyEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  historyEmptySubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  historyScrollView: {
    maxHeight: 350,
  },
  paymentHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentHistoryInfo: {
    flex: 1,
  },
  paymentBillNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  paymentHistoryAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 3,
  },
  paymentHistoryMethod: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentHistoryNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  paymentHistoryRight: {
    alignItems: 'flex-end',
  },
  paymentHistoryDate: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  paymentHistoryTime: {
    fontSize: 11,
    color: '#999',
  },
});
