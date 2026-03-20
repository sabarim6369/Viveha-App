import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  getInvoices,
  getPendingInvoices,
  useNetworkStatus,
  createReminder,
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

// Type Definitions
interface RecentPurchasesScreenProps {
  navigation: any;
}

interface Product {
  itemName: string;
  quantity: number;
  costPerUnit?: number;
  price?: number;
}

interface PendingInvoiceItem {
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

interface PendingInvoice {
  id: string;
  invoiceId: string;
  serverId?: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientCustomerId?: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  date: string;
  time: string;
  dueDate?: string;
  invoiceDate?: string;
  items: PendingInvoiceItem[];
  products: Product[];
  createdAt?: string;
  additionalFees?: AdditionalFee[];
  customCharges?: any[];
  subtotal?: number;
  subTotal?: number;
  tax?: number;
  totalTax?: number;
  discount?: number;
  totalDiscount?: number;
}

interface GroupedCustomer {
  clientName: string;
  clientPhone: string;
  clientCustomerId?: string;
  totalPending: number;
  invoiceCount: number;
  invoices: PendingInvoice[];
}

export default function RecentPurchasesScreen({ navigation }: RecentPurchasesScreenProps): React.JSX.Element {
  const [pendings, setPendings] = useState<PendingInvoice[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [reminderModalVisible, setReminderModalVisible] = useState<boolean>(false);
  const [reminderCustomer, setReminderCustomer] = useState<GroupedCustomer | null>(null);
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Open reminder modal
  const openReminderModal = (customer: GroupedCustomer) => {
    setReminderCustomer(customer);
    setReminderModalVisible(true);
  };

  // Save reminder to backend
  const saveReminder = async () => {
    if (!reminderCustomer) return;

    try {
      console.log('🔔 Setting reminder for:', reminderCustomer.clientName);
      
      // Create reminder via backend API
      const result = await createReminder({
        customerName: reminderCustomer.clientName,
        customerPhone: reminderCustomer.clientPhone,
        customerId: reminderCustomer.clientCustomerId,
        amount: reminderCustomer.totalPending,
        reminderDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        message: `Follow up with ${reminderCustomer.clientName} for pending payment`,
      });

      console.log('📥 Reminder result:', result);

      if (result.success) {
        console.log('✅ Reminder created successfully');
        // Show success toast
        Toast.show({
          type: 'success',
          text1: 'Reminder Set',
          text2: 'Reminder set for tomorrow',
        });

        // Close modal
        setReminderModalVisible(false);
        setReminderCustomer(null);
      } else {
        console.error('❌ Failed to create reminder:', result.error);
        throw new Error(result.error || 'Failed to set reminder');
      }
    } catch (error: any) {
      console.error('❌ Error saving reminder:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to set reminder',
      });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPendings();
      return () => {
        console.log('📱 [RecentPurchasesScreen] Screen unfocused');
      };
    }, [])
  );

  const loadPendings = async (): Promise<void> => {
    try {
      setLoading(true);

      console.log('📋 [RecentPurchasesScreen] Loading recent purchases...');
      
      // Fetch pending invoices directly from storage
      const backendPendings = await getPendingInvoices();

      console.log(`📊 [RecentPurchasesScreen] Received ${backendPendings?.length || 0} pending invoices`);

      if (!Array.isArray(backendPendings)) {
        setPendings([]);
        setLoading(false);
        return;
      }

      // Map backend data to frontend format
      const pendingInvoices = backendPendings
        .filter((inv: any) => {
          // Only include valid invoices
          if (!inv || (!inv._id && !inv.id)) return false;

          // Get amounts from backend
          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

          // Must have valid amounts
          if (isNaN(totalAmount) || totalAmount <= 0) return false;

          return true;
        })
        .map((inv: any) => {
          const invoiceId = inv._id || inv.id;
          const invoiceIdStr = String(invoiceId);
          const shortId = invoiceIdStr.length > 6 ? invoiceIdStr.slice(-6) : invoiceIdStr;

          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

          // Map products array to items format for InvoicePreviewScreen
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
            clientName: inv.clientCustomerName || 'Unknown Client',
            clientPhone: inv.clientCustomerPhone || '',
            clientCustomerId: inv.clientCustomerId,
            amount: pendingAmount,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            status: inv.status || 'pending',
            date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            dueDate: inv.dueDate,
            invoiceDate: inv.invoiceDate,
            items: items,
            products: inv.products || [],
            subtotal: inv.subtotal || inv.subTotal,
            subTotal: inv.subTotal || inv.subtotal,
            tax: inv.tax || inv.totalTax,
            totalTax: inv.totalTax || inv.tax,
            discount: inv.discount || inv.totalDiscount,
            totalDiscount: inv.totalDiscount || inv.discount,
            additionalFees: inv.additionalFees || [],
            customCharges: inv.customCharges || [],
          };
        })
        .reverse(); // Show newest first

      setPendings(pendingInvoices);

      // Show offline indicator if not connected
      if (!isConnected || !isInternetReachable) {
        if (pendingInvoices.length > 0) {
          Toast.show({
            type: 'info',
            text1: 'Offline Mode',
            text2: 'Showing cached data. Connect to sync.',
            position: 'bottom',
            visibilityTime: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Error loading recent purchases:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load recent purchases',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadPendings();
    setRefreshing(false);
  };

  // Group pendings by customer
  const groupedCustomers = (): GroupedCustomer[] => {
    const customerMap = new Map<string, GroupedCustomer>();

    pendings.forEach((pending) => {
      const key = `${pending.clientName}-${pending.clientPhone}`;
      
      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.totalPending += pending.amount;
        existing.invoiceCount += 1;
        existing.invoices.push(pending);
        // Update clientCustomerId if not already set
        if (!existing.clientCustomerId && pending.clientCustomerId) {
          existing.clientCustomerId = pending.clientCustomerId;
        }
      } else {
        customerMap.set(key, {
          clientName: pending.clientName,
          clientPhone: pending.clientPhone,
          clientCustomerId: pending.clientCustomerId,
          totalPending: pending.amount,
          invoiceCount: 1,
          invoices: [pending],
        });
      }
    });

    return Array.from(customerMap.values());
  };

  const parseDueDate = (dueDateStr: string | undefined): Date | null => {
    if (!dueDateStr) return null;
    if (dueDateStr.includes('/')) {
      const [day, month, year] = dueDateStr.split('/').map(num => parseInt(num, 10));
      return new Date(year, month - 1, day);
    }
    const d = new Date(dueDateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const isOverdue = (invoice: PendingInvoice): boolean => {
    const dueDate = parseDueDate(invoice.dueDate);
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const isDueToday = (invoice: PendingInvoice): boolean => {
    const dueDate = parseDueDate(invoice.dueDate);
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  };

  const getDaysOverdue = (invoice: PendingInvoice): number => {
    const dueDate = parseDueDate(invoice.dueDate);
    if (!dueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const formatDueDateShort = (dueDateStr: string | undefined): string => {
    const d = parseDueDate(dueDateStr);
    if (!d) return '';
    const months = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const getTimeAgo = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Check if any of customer's invoices are overdue
  const hasOverdueInvoice = (customer: GroupedCustomer): boolean => {
    return customer.invoices.some(inv => isOverdue(inv));
  };

  // Split customers into overdue and regular
  const splitCustomersByDueDate = () => {
    const allCustomers = groupedCustomers();
    const overdue: GroupedCustomer[] = [];
    const regular: GroupedCustomer[] = [];

    allCustomers.forEach(customer => {
      if (hasOverdueInvoice(customer)) {
        overdue.push(customer);
      } else {
        regular.push(customer);
      }
    });

    return { overdue, regular };
  };

  const handleCustomerPress = (customer: GroupedCustomer): void => {
    console.log('🚀 Navigating to CustomerInvoices with customer:', {
      clientName: customer.clientName,
      clientPhone: customer.clientPhone,
      clientCustomerId: customer.clientCustomerId,
      invoiceCount: customer.invoiceCount,
    });
    navigation.navigate('CustomerInvoices', { customer });
  };

  const { overdue: overdueCustomers, regular: regularCustomers } = splitCustomersByDueDate();

  const formatCurrency = (amount: number): string => {
    return `Rs.${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recent Purchases</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E46269" />
          <Text style={styles.loadingText}>Loading recent purchases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Purchases</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Recent Purchases */}
        {regularCustomers.length > 0 && (
          <View style={styles.section}>
            {/* <Text style={styles.sectionTitle}>Recent Purchases</Text> */}
            {regularCustomers.map((customer) => {
              const customerKey = `${customer.clientName}-${customer.clientPhone}`;
              const firstInv = customer.invoices && customer.invoices[0];
              const purchaseLabel = firstInv
                ? `Purchase ${firstInv.invoiceNumber || ''} ${getTimeAgo(firstInv.createdAt)}`
                : 'Pending';
              const dueLabel = firstInv && firstInv.dueDate
                ? `Due: ${formatDueDateShort(firstInv.dueDate)}`
                : '';

              return (
                <TouchableOpacity
                  key={customerKey}
                  style={styles.simpleCard}
                  onPress={() => handleCustomerPress(customer)}
                  activeOpacity={0.7}
                >
                  <View style={styles.customerLeft}>
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name={"person" as any} size={24} color="#E88E99" />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{customer.clientName}</Text>
                      <Text style={styles.customerPaymentFinalized}>{purchaseLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.customerRight}>
                    <Text style={styles.simpleCardAmount}>Rs.{customer.totalPending.toFixed(2)}</Text>
                    <Text style={styles.simpleCardDue}>{dueLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {regularCustomers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Recent Purchases</Text>
            <Text style={styles.emptySubtitle}>When customers make purchases, they'll appear here</Text>
          </View>
        )}
      </ScrollView>

      <Footer navigation={navigation} />

      {/* Reminder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reminderModalVisible}
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Reminder</Text>
              <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.reminderCustomerName}>
                {reminderCustomer?.clientName}
              </Text>
              <Text style={styles.reminderAmount}>
                Amount: Rs.{reminderCustomer?.totalPending?.toFixed(2)}
              </Text>
              <Text style={styles.reminderMessage}>
                A reminder will be set for tomorrow to follow up on this pending payment.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setReminderModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveReminder}
              >
                <Text style={styles.confirmButtonText}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
   
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overdueCustomerCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  customerLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  customerPaymentFinalized: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  customerInvoiceCount: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  customerRight: {
    alignItems: 'flex-end',
  },
  customerTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E88E99',
    marginBottom: 4,
  },
  customerTotalAmountRed: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 2,
  },
  customerTotalAmountGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 2,
  },
  customerAvailable: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  overdueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  simpleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  simpleCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
  },
  simpleCardDue: {
    fontSize: 11,
    color: '#6B7280',
  },
  customerActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  sendReminderButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendReminderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueAvatar: {
    backgroundColor: '#FEE2E2',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  reminderCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reminderAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  reminderMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#E46269',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
