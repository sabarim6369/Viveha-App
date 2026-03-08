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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInvoices,
  getPendingInvoices,
  recordPayment,
} from '../utils/NetworkManager';
import PaymentSuccessModal from '../Components/PaymentSuccessModal';

interface Product {
  itemName: string;
  quantity: number;
  costPerUnit?: number;
  price?: number;
}

interface PendingInvoiceItem {
  name: string;
  quantity: number;
  price: number;
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
}

interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  paymentType: 'full' | 'partial';
}

interface PaymentResult {
  success: boolean;
  synced?: boolean;
  error?: string;
}

interface CustomerInvoicesScreenProps {
  navigation: any;
  route: any;
}

export default function CustomerInvoicesScreen({ navigation, route }: CustomerInvoicesScreenProps): React.JSX.Element {
  const { customer } = route.params;
  const [invoices, setInvoices] = useState<PendingInvoice[]>(customer.invoices || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] = useState<boolean>(false);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [successPaymentDetails, setSuccessPaymentDetails] = useState<{
    customerName: string;
    invoiceNumber: string;
    paidAmount: number;
    remainingAmount: number;
  } | null>(null);

  const getTotalPending = (): number => {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getTotalPaid = (): number => {
    return invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  };

  // Check if invoice is overdue
  const isOverdue = (invoice: PendingInvoice): boolean => {
    if (!invoice.dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse date in DD/MM/YYYY format
    let dueDate: Date;
    if (invoice.dueDate.includes('/')) {
      const [day, month, year] = invoice.dueDate.split('/').map(num => parseInt(num, 10));
      dueDate = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      dueDate = new Date(invoice.dueDate);
    }
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  // Split invoices into overdue and regular
  const getInvoicesSplit = () => {
    const overdue: PendingInvoice[] = [];
    const regular: PendingInvoice[] = [];

    invoices.forEach(invoice => {
      if (isOverdue(invoice)) {
        overdue.push(invoice);
      } else {
        regular.push(invoice);
      }
    });

    return { overdue, regular };
  };

  const { overdue: overdueInvoices, regular: regularInvoices } = getInvoicesSplit();

  const handleViewInvoice = async (invoice: PendingInvoice): Promise<void> => {
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
        const items = invoice.items || (invoice.products || []).map((product: Product) => ({
          name: product.itemName || 'Unknown Item',
          quantity: product.quantity || 0,
          price: product.costPerUnit || product.price || 0,
          salePrice: product.costPerUnit || product.price || 0,
          unit: 'unit',
          tax: 0,
          discount: 0,
        }));

        const invoiceData = invoice as any;
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

  const handleSendReminder = (invoice: PendingInvoice): void => {
    Toast.show({
      type: 'success',
      text1: 'Reminder Sent',
      text2: `Reminder sent to ${invoice.clientName}`,
      position: 'bottom',
    });
  };

  const getCustomerId = (): string | undefined => {
    // Try multiple sources for customer ID
    return customer.clientCustomerId ||
      (customer.invoices && customer.invoices[0]?.clientCustomerId) ||
      (invoices && invoices[0]?.clientCustomerId);
  };

  const handleShowPaymentHistory = async (invoice: PendingInvoice): Promise<void> => {
    // Navigate to Customer Profile Screen - show ONLY this specific invoice
    const customerId = getCustomerId() || invoice.clientCustomerId;

    console.log('🔍 Customer ID lookup:', {
      fromCustomer: customer.clientCustomerId,
      fromInvoice: invoice.clientCustomerId,
      fromFirstInvoice: customer.invoices?.[0]?.clientCustomerId,
      finalCustomerId: customerId,
      customer: customer
    });

    if (!customerId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Customer ID not found',
        position: 'bottom',
      });
      return;
    }

    navigation.navigate('CustomerProfile', {
      customerId: customerId,
      customerName: customer.clientName || invoice.clientName,
      specificInvoiceId: invoice.invoiceId, // Pass specific invoice ID
      specificInvoiceNumber: invoice.invoiceNumber, // Pass invoice number for display
    });
  };

  const handlePayPress = (invoice: PendingInvoice): void => {
    setSelectedInvoice(invoice);
    setPaymentModalVisible(true);
  };

  const handlePayFully = async (): Promise<void> => {
    if (processingPayment) return;

    try {
      setProcessingPayment(true);

      const paymentRecord: PaymentRecord = {
        id: Date.now().toString(),
        invoiceId: selectedInvoice!.invoiceId,
        invoiceNumber: selectedInvoice!.invoiceNumber,
        amount: selectedInvoice!.amount,
        paymentMethod: 'cash',
        paymentType: 'full',
      };

      const paymentResult: PaymentResult = await recordPayment(paymentRecord);

      if (paymentResult.success) {
        // Store payment details for success modal
        setSuccessPaymentDetails({
          customerName: selectedInvoice!.clientName,
          invoiceNumber: selectedInvoice!.invoiceNumber,
          paidAmount: selectedInvoice!.amount,
          remainingAmount: 0,
        });

        setPaymentModalVisible(false);
        setSelectedInvoice(null);

        await new Promise(resolve => setTimeout(resolve, 200));

        // Reload invoices
        const allPendings = await getPendingInvoices();
        const customerInvoices = allPendings.filter((inv: any) =>
          inv.clientCustomerName === customer.clientName &&
          inv.clientCustomerPhone === customer.clientPhone
        ).map((inv: any) => {
          const invoiceId = inv._id || inv.id;
          const invoiceIdStr = String(invoiceId);
          const shortId = invoiceIdStr.length > 6 ? invoiceIdStr.slice(-6) : invoiceIdStr;

          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

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
          };
        });

        setInvoices(customerInvoices);

        // If no more invoices, go back
        if (customerInvoices.length === 0) {
          Toast.show({
            type: 'success',
            text1: 'All Paid!',
            text2: 'All invoices have been settled',
            position: 'bottom',
          });
          navigation.goBack();
          return;
        }

        // Show success modal
        setSuccessModalVisible(true);
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error updating payment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update payment',
        position: 'bottom',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePayPartially = (): void => {
    setPaymentModalVisible(false);
    setPartialPaymentModalVisible(true);
  };

  const handlePartialPaymentSubmit = async (): Promise<void> => {
    if (processingPayment) return;

    const amount = parseFloat(partialAmount);

    if (isNaN(amount) || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid amount',
        position: 'bottom',
      });
      return;
    }

    if (amount > selectedInvoice!.amount) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: `Amount cannot exceed pending balance (Rs.${selectedInvoice!.amount})`,
        position: 'bottom',
      });
      return;
    }

    const isFullPayment = Math.abs(amount - selectedInvoice!.amount) < 0.01;

    try {
      setProcessingPayment(true);

      const paymentRecord: PaymentRecord = {
        id: Date.now().toString(),
        invoiceId: selectedInvoice!.invoiceId,
        invoiceNumber: selectedInvoice!.invoiceNumber,
        amount: amount,
        paymentMethod: 'cash',
        paymentType: isFullPayment ? 'full' : 'partial',
      };

      const paymentResult: PaymentResult = await recordPayment(paymentRecord);

      if (paymentResult.success) {
        const newRemaining = selectedInvoice!.amount - amount;

        // Store payment details for success modal
        setSuccessPaymentDetails({
          customerName: selectedInvoice!.clientName,
          invoiceNumber: selectedInvoice!.invoiceNumber,
          paidAmount: amount,
          remainingAmount: newRemaining,
        });

        setPartialPaymentModalVisible(false);
        setSelectedInvoice(null);
        setPartialAmount('');

        await new Promise(resolve => setTimeout(resolve, 200));

        // Reload invoices
        const allPendings = await getPendingInvoices();
        const customerInvoices = allPendings.filter((inv: any) =>
          inv.clientCustomerName === customer.clientName &&
          inv.clientCustomerPhone === customer.clientPhone
        ).map((inv: any) => {
          const invoiceId = inv._id || inv.id;
          const invoiceIdStr = String(invoiceId);
          const shortId = invoiceIdStr.length > 6 ? invoiceIdStr.slice(-6) : invoiceIdStr;

          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

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
          };
        });

        setInvoices(customerInvoices);

        // If no more invoices, go back
        if (customerInvoices.length === 0) {
          Toast.show({
            type: 'success',
            text1: 'All Paid!',
            text2: 'All invoices have been settled',
            position: 'bottom',
          });
          navigation.goBack();
          return;
        }

        // Show success modal
        setSuccessModalVisible(true);
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error updating payment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update payment',
        position: 'bottom',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{customer.clientName}</Text>
          <Text style={styles.headerSubtitle}>{customer.clientPhone}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Text style={styles.summaryLabel}>Total Pending</Text>
          <Text style={styles.summaryAmount}>Rs.{getTotalPending().toFixed(2)}</Text>
        </View>
        {/* <View style={[styles.summaryCard, styles.paidCard]}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryAmountGreen}>Rs.{getTotalPaid().toFixed(2)}</Text>
        </View> */}
        <View style={[styles.summaryCard, styles.countCard]}>
          <Text style={styles.summaryLabel}>Invoices</Text>
          <Text style={styles.summaryCount}>{invoices.length}</Text>
        </View>
      </View>

      {/* Payment History Button */}
      <View style={styles.paymentHistoryButtonContainer}>
        <TouchableOpacity
          style={styles.paymentHistoryMainButton}
          onPress={() => {
            const customerId = getCustomerId();

            if (!customerId) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Customer ID not found',
                position: 'bottom',
              });
              return;
            }

            navigation.navigate('CustomerProfile', {
              customerId: customerId,
              customerName: customer.clientName,
            });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={"time-outline" as any} size={20} color="#4A90E2" />
          <Text style={styles.paymentHistoryMainButtonText}>Payment History</Text>
          <Ionicons name={"chevron-forward" as any} size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overdue Invoices Section */}
        {overdueInvoices.length > 0 && (
          <View style={styles.invoicesSection}>
            <View style={styles.overdueSectionHeader}>
              <Ionicons name={"alert-circle" as any} size={20} color="#EF4444" />
              <Text style={[styles.sectionTitle, styles.overdueSectionTitle]}>Overdue Invoices</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Invoices past due date</Text>

            {overdueInvoices.map((invoice) => (
              <View key={invoice.id} style={[styles.invoiceCard, styles.overdueInvoiceCard]}>
                <TouchableOpacity
                  style={styles.invoiceHeader}
                  onPress={() => handleShowPaymentHistory(invoice)}
                  activeOpacity={0.7}
                >
                  <View style={styles.invoiceLeft}>
                    <Ionicons name={"document-text-outline" as any} size={24} color="#EF4444" />
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                      <Text style={styles.invoiceDate}>{invoice.date} • {invoice.time}</Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRight}>
                    <View style={styles.amountContainer}>
                      <Text style={[styles.invoiceAmount, styles.overdueAmount]}>Rs.{invoice.amount.toFixed(2)}</Text>
                      <Text style={styles.totalAmountText}>of Rs.{invoice.totalAmount.toFixed(2)}</Text>
                    </View>
                    {invoice.paidAmount > 0 && (
                      <Text style={styles.paidAmountText}>Paid: Rs.{invoice.paidAmount.toFixed(2)}</Text>
                    )}
                    <View style={styles.historyBadge}>
                      <Ionicons name={"time-outline" as any} size={12} color="#4A90E2" />
                      <Text style={styles.historyBadgeText}>History</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        styles.overdueProgressFill,
                        { width: `${(invoice.paidAmount / invoice.totalAmount) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {((invoice.paidAmount / invoice.totalAmount) * 100).toFixed(0)}% paid
                  </Text>
                </View>

                <View style={styles.invoiceActions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleViewInvoice(invoice)}
                  >
                    <Ionicons name={"eye-outline" as any} size={16} color="#4A90E2" />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paymentHistoryButton}
                    onPress={() => handleShowPaymentHistory(invoice)}
                  >
                    <Ionicons name={"time-outline" as any} size={16} color="#666" />
                    <Text style={styles.paymentHistoryText}>History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayPress(invoice)}
                  >
                    <Ionicons name={"cash-outline" as any} size={16} color="#fff" />
                    <Text style={styles.payButtonText}>Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Regular Invoices Section */}
        {regularInvoices.length > 0 && (
          <View style={styles.invoicesSection}>
            <Text style={styles.sectionTitle}>
              {overdueInvoices.length > 0 ? 'Pending Invoices' : 'All Invoices'}
            </Text>

            {regularInvoices.map((invoice) => (
              <View key={invoice.id} style={styles.invoiceCard}>
                <TouchableOpacity
                  style={styles.invoiceHeader}
                  onPress={() => handleShowPaymentHistory(invoice)}
                  activeOpacity={0.7}
                >
                  <View style={styles.invoiceLeft}>
                    <Ionicons name={"document-text-outline" as any} size={24} color="#4A90E2" />
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                      <Text style={styles.invoiceDate}>{invoice.date} • {invoice.time}</Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRight}>
                    <View style={styles.amountContainer}>
                      <Text style={styles.invoiceAmount}>Rs.{invoice.amount.toFixed(2)}</Text>
                      <Text style={styles.totalAmountText}>of Rs.{invoice.totalAmount.toFixed(2)}</Text>
                    </View>
                    {invoice.paidAmount > 0 && (
                      <Text style={styles.paidAmountText}>Paid: Rs.{invoice.paidAmount.toFixed(2)}</Text>
                    )}
                    <View style={styles.historyBadge}>
                      <Ionicons name={"time-outline" as any} size={12} color="#4A90E2" />
                      <Text style={styles.historyBadgeText}>History</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(invoice.paidAmount / invoice.totalAmount) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {((invoice.paidAmount / invoice.totalAmount) * 100).toFixed(0)}% paid
                  </Text>
                </View>

                <View style={styles.invoiceActions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleViewInvoice(invoice)}
                  >
                    <Ionicons name={"eye-outline" as any} size={16} color="#4A90E2" />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paymentHistoryButton}
                    onPress={() => handleShowPaymentHistory(invoice)}
                  >
                    <Ionicons name={"time-outline" as any} size={16} color="#666" />
                    <Text style={styles.paymentHistoryText}>History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayPress(invoice)}
                  >
                    <Ionicons name={"cash-outline" as any} size={16} color="#fff" />
                    <Text style={styles.payButtonText}>Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E88E99" />
          </View>
        ) : invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={"receipt-outline" as any} size={60} color="#ccc" />
            <Text style={styles.emptyText}>No pending invoices</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Options</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name={"close" as any} size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Amount Due:</Text>
                <Text style={styles.paymentInfoAmount}>Rs.{selectedInvoice.amount.toFixed(2)}</Text>
                <Text style={styles.paymentInfoClient}>{selectedInvoice.invoiceNumber}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.paymentOption} onPress={handlePayFully}>
              <View style={styles.paymentOptionIcon}>
                <Ionicons name={"checkmark-done" as any} size={24} color="#4CAF50" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Fully</Text>
                <Text style={styles.paymentOptionDesc}>Mark this invoice as fully paid</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentOption} onPress={handlePayPartially}>
              <View style={styles.paymentOptionIcon}>
                <Ionicons name={"cash" as any} size={24} color="#4A90E2" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Partially</Text>
                <Text style={styles.paymentOptionDesc}>Enter partial payment amount</Text>
              </View>
              <Ionicons name={"chevron-forward" as any} size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Partial Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={partialPaymentModalVisible}
        onRequestClose={() => setPartialPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partial Payment</Text>
              <TouchableOpacity onPress={() => {
                setPartialPaymentModalVisible(false);
                setPartialAmount('');
              }}>
                <Ionicons name={"close" as any} size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentInfoLabel}>Total Amount Due:</Text>
                  <Text style={styles.paymentInfoAmount}>Rs.{selectedInvoice.amount.toFixed(2)}</Text>
                  <Text style={styles.paymentInfoClient}>{selectedInvoice.invoiceNumber}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Enter Payment Amount</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencySymbol}>Rs.</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={partialAmount}
                      onChangeText={setPartialAmount}
                      autoFocus
                    />
                  </View>
                  {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < selectedInvoice.amount && (
                    <Text style={styles.remainingText}>
                      Remaining: Rs.{(selectedInvoice.amount - parseFloat(partialAmount)).toFixed(2)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handlePartialPaymentSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Success Modal */}
      {successPaymentDetails && (
        <PaymentSuccessModal
          visible={successModalVisible}
          onClose={() => {
            setSuccessModalVisible(false);
            setSuccessPaymentDetails(null);
          }}
          customerName={successPaymentDetails.customerName}
          invoiceNumber={successPaymentDetails.invoiceNumber}
          paidAmount={successPaymentDetails.paidAmount}
          remainingAmount={successPaymentDetails.remainingAmount}
        />
      )}
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
  headerRight: {
    width: 32,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: '#fff',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  paidCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  countCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  summaryAmountGreen: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A90E2',
  },
  paymentHistoryButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  paymentHistoryMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  paymentHistoryMainButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
  },
  scrollView: {
    flex: 1,
  },
  invoicesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  overdueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  overdueSectionTitle: {
    color: '#EF4444',
    marginBottom: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  overdueInvoiceCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  overdueTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  overdueTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  overdueAmount: {
    color: '#EF4444',
  },
  overdueProgressFill: {
    backgroundColor: '#EF4444',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  invoiceInfo: {
    marginLeft: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 2,
  },
  totalAmountText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  paidAmountText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    gap: 3,
  },
  historyBadgeText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
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
  viewButtonText: {
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentHistoryText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payButtonText: {
    color: '#fff',
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
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  paymentInfo: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  paymentInfoAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  paymentInfoClient: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 16,
  },
  remainingText: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 8,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
