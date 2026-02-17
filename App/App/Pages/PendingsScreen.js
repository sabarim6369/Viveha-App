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
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  getInvoices,
  getPendingInvoices,
  saveInvoice,
  recordPayment,
  useNetworkStatus
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

export default function PendingsScreen({ navigation }) {
  const [pendings, setPendings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { isConnected, isInternetReachable } = useNetworkStatus();

  useEffect(() => {
    loadPendings();
  }, []);

  useEffect(() => {
    // Reload when connection is restored
    if (isConnected && isInternetReachable) {
      loadPendings();
    }
  }, [isConnected, isInternetReachable]);

  const loadPendings = async () => {
    try {
      setLoading(true);

      console.log('📋 [PendingsScreen] Loading pending invoices...');

      // Fetch pending invoices directly from storage
      const backendPendings = await getPendingInvoices();

      console.log(`📊 [PendingsScreen] Received ${backendPendings?.length || 0} pending invoices`);
      if (backendPendings?.length > 0) {
        console.log('📝 All pending invoices received:', backendPendings.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          pendingAmount: inv.pendingAmount
        })));
      }

      if (!Array.isArray(backendPendings)) {
        setPendings([]);
        setLoading(false);
        return;
      }

      // Map backend data to frontend format
      const pendingInvoices = backendPendings
        .filter(inv => {
          // Only include valid invoices
          if (!inv || (!inv._id && !inv.id)) return false;

          // Get amounts from backend
          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

          // Must have valid amounts
          if (isNaN(totalAmount) || totalAmount <= 0) return false;
          if (pendingAmount <= 0) return false;

          return true;
        })
        .map(inv => {
          const invoiceId = inv._id || inv.id;
          const invoiceIdStr = String(invoiceId);
          const shortId = invoiceIdStr.length > 6 ? invoiceIdStr.slice(-6) : invoiceIdStr;

          const totalAmount = parseFloat(inv.totalAmount || 0);
          const paidAmount = parseFloat(inv.paidAmount || 0);
          const pendingAmount = parseFloat(inv.pendingAmount || 0);

          // Map products array to items format for InvoicePreviewScreen
          const items = (inv.products || []).map(product => ({
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
        })
        .reverse(); // Show newest first

      console.log(`🎯 [PendingsScreen] Setting ${pendingInvoices.length} invoices to state:`,
        pendingInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          paidSoFar: inv.paidSoFar
        }))
      );

      setPendings(pendingInvoices);
      setRefreshKey(prev => prev + 1); // Force re-render

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
      console.error('Error loading pendings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load pending invoices',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendings();
    setRefreshing(false);
  };

  const getTotalPending = () => {
    return pendings.reduce((sum, p) => sum + p.amount, 0);
  };

  // Filter pendings based on search query
  const filteredPendings = pendings.filter((pending) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const clientName = (pending.clientName || '').toLowerCase();
    const clientPhone = (pending.clientPhone || '').toLowerCase();
    const invoiceNumber = (pending.invoiceNumber || '').toLowerCase();

    return clientName.includes(query) ||
      clientPhone.includes(query) ||
      invoiceNumber.includes(query);
  });

  const handlePayPress = (pending) => {
    setSelectedPending(pending);
    setPaymentModalVisible(true);
  };

  const handleViewInvoice = async (pending) => {
    try {
      // Fetch invoices from backend
      const invoices = await getInvoices();

      // Find invoice by ID or invoice number
      let invoice = invoices.find(inv =>
        inv.id === pending.invoiceId ||
        inv._id === pending.invoiceId ||
        inv.serverId === pending.serverId
      );

      if (!invoice) {
        invoice = invoices.find(inv =>
          inv.number === pending.invoiceNumber ||
          inv.invoiceNumber === pending.invoiceNumber
        );
      }

      // If still not found, construct invoice from pending data
      if (!invoice && pending) {
        // Map products to items format if available
        const items = pending.items || (pending.products || []).map(product => ({
          name: product.itemName || 'Unknown Item',
          quantity: product.quantity || 0,
          price: product.costPerUnit || product.price || 0,
        }));

        invoice = {
          id: pending.invoiceId,
          serverId: pending.serverId,
          number: pending.invoiceNumber,
          invoiceNumber: pending.invoiceNumber,
          clientInfo: {
            name: pending.clientName,
            phone: pending.clientPhone,
          },
          clientName: pending.clientName,
          clientPhone: pending.clientPhone,
          total: pending.totalAmount,
          grandTotal: pending.totalAmount,
          subTotal: pending.totalAmount || pending.subtotal || 0,
          totalAmount: pending.totalAmount,
          paidAmount: pending.paidAmount,
          pendingAmount: pending.amount,
          discount: 0,
          status: pending.status,
          invoiceDate: pending.invoiceDate || pending.date,
          dueDate: pending.dueDate || pending.date,
          date: pending.date,
          items: items,
          createdAt: pending.createdAt,
        };
      }

      if (invoice) {
        navigation.navigate('InvoicePreview', { invoice, isPreview: false });
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

  const handleSendReminder = (pending) => {
    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${pending.clientName} (${pending.clientPhone})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SMS',
          onPress: () => Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Reminder sent via SMS',
            position: 'bottom',
          })
        },
        {
          text: 'Send WhatsApp',
          onPress: () => Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Reminder sent via WhatsApp',
            position: 'bottom',
          })
        }
      ]
    );
  };

  const handlePayFully = async () => {
    if (processingPayment) return;

    try {
      setProcessingPayment(true);

      // Record payment (backend updates paidAmount automatically)
      const paymentRecord = {
        invoiceId: selectedPending.invoiceId,
        invoiceNumber: selectedPending.invoiceNumber,
        amount: selectedPending.amount,
        paymentMethod: 'cash',
        paymentType: 'full',
      };

      const paymentResult = await recordPayment(paymentRecord);

      if (paymentResult.success) {
        console.log('✅ Payment successful, reloading...');

        // Close modal
        setPaymentModalVisible(false);
        setSelectedPending(null);

        // Wait for storage to commit  
        await new Promise(resolve => setTimeout(resolve, 200));

        // Reload immediately from storage
        await loadPendings();

        Toast.show({
          type: 'success',
          text1: 'Payment Completed',
          text2: paymentResult.synced ? 'Synced to backend' : 'Saved offline (will sync later)',
          position: 'bottom',
          visibilityTime: 2000,
        });
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error) {
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

  const handlePayPartially = () => {
    setPaymentModalVisible(false);
    setPartialPaymentModalVisible(true);
  };

  const handlePartialPaymentSubmit = async () => {
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

    // Check if amount exceeds pending balance
    if (amount > selectedPending.amount) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: `Amount cannot exceed pending balance (Rs.${selectedPending.amount})`,
        position: 'bottom',
      });
      return;
    }

    // Check if it's actually a full payment (entered amount equals pending amount)
    const isFullPayment = Math.abs(amount - selectedPending.amount) < 0.01;

    try {
      setProcessingPayment(true);

      // Record partial payment (backend updates paidAmount automatically)
      const paymentRecord = {
        invoiceId: selectedPending.invoiceId,
        invoiceNumber: selectedPending.invoiceNumber,
        amount: amount,
        paymentMethod: 'cash',
        paymentType: isFullPayment ? 'full' : 'partial',
      };

      const paymentResult = await recordPayment(paymentRecord);

      if (paymentResult.success) {
        console.log('✅ Partial payment successful, reloading...');

        const newRemaining = selectedPending.amount - amount;

        // Close modal
        setPartialPaymentModalVisible(false);
        setSelectedPending(null);
        setPartialAmount('');

        // Wait for storage to commit
        await new Promise(resolve => setTimeout(resolve, 200));

        // Reload immediately from storage
        await loadPendings();

        const syncMsg = paymentResult.synced ? '' : ' (offline)';
        Toast.show({
          type: 'success',
          text1: 'Partial Payment Recorded',
          text2: `Paid Rs.${amount.toFixed(2)} | Balance: Rs.${newRemaining.toFixed(2)}${syncMsg}`,
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error) {
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
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Pending Payments</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or invoice number..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.overdueCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Total Pending</Text>
              <View style={styles.overdueIcon}>
                <Ionicons name="cash-outline" size={16} color="#FF6B6B" />
              </View>
            </View>
            <Text style={styles.summaryNumber}>{pendings.length}</Text>
            <Text style={styles.summarySubtext}>Rs.{getTotalPending().toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.deliveryCard]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Today</Text>
              <View style={styles.deliveryBadge}>
                <Text style={styles.deliveryBadgeText}>
                  {pendings.filter(p => p.date === new Date().toLocaleDateString()).length}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryNumber}>
              {pendings.filter(p => p.date === new Date().toLocaleDateString()).length}
            </Text>
            <Text style={styles.summarySubtext}>invoices</Text>
          </View>
        </View>

        {/* Action Required Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Pending Invoices</Text>
            {searchQuery.length > 0 && (
              <Text style={styles.resultCount}>
                {filteredPendings.length} result{filteredPendings.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E88E99" />
              <Text style={styles.loadingText}>Loading pending invoices...</Text>
            </View>
          ) : filteredPendings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name={searchQuery.length > 0 ? "search-outline" : "receipt-outline"} size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery.length > 0 ? 'No matching results' : 'No pending payments'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0 ? 'Try searching with a different keyword' : 'Create an invoice to get started'}
              </Text>
            </View>
          ) : (
            filteredPendings.map((pending) => (
              <View key={pending.id} style={styles.pendingCard}>
                <View style={styles.pendingCardHeader}>
                  <View style={styles.pendingLeft}>
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#E88E99" />
                    </View>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingName}>{pending.clientName}</Text>
                      <Text style={styles.pendingPhone}>{pending.clientPhone}</Text>
                      <Text style={styles.pendingInvoice}>{pending.invoiceNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.pendingRight}>
                    <Text style={styles.pendingAmount}>Rs.{pending.amount.toFixed(2)}</Text>
                    <Text style={styles.pendingTime}>{pending.date}</Text>
                    <Text style={styles.pendingTimeSmall}>{pending.time}</Text>
                  </View>
                </View>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={styles.viewInvoiceButton}
                    onPress={() => handleViewInvoice(pending)}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#4A90E2" />
                    <Text style={styles.viewInvoiceText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reminderButton}
                    onPress={() => handleSendReminder(pending)}
                  >
                    <Ionicons name="send-outline" size={16} color="#fff" />
                    <Text style={styles.reminderButtonText}>Remind</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => handlePayPress(pending)}
                  >
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={styles.markPaidText}>Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddInvoice')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedPending && (
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Amount Due:</Text>
                <Text style={styles.paymentInfoAmount}>Rs.{selectedPending.amount.toFixed(2)}</Text>
                <Text style={styles.paymentInfoClient}>{selectedPending.clientName}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={handlePayFully}
            >
              <View style={styles.paymentOptionIcon}>
                <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Fully</Text>
                <Text style={styles.paymentOptionDesc}>Mark this invoice as fully paid</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={handlePayPartially}
            >
              <View style={styles.paymentOptionIcon}>
                <Ionicons name="cash" size={24} color="#4A90E2" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Partially</Text>
                <Text style={styles.paymentOptionDesc}>Enter partial payment amount</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedPending && (
              <View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentInfoLabel}>Total Amount Due:</Text>
                  <Text style={styles.paymentInfoAmount}>Rs.{selectedPending.amount.toFixed(2)}</Text>
                  <Text style={styles.paymentInfoClient}>{selectedPending.clientName}</Text>
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
                  {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < selectedPending.amount && (
                    <Text style={styles.remainingText}>
                      Remaining: Rs.{(selectedPending.amount - parseFloat(partialAmount)).toFixed(2)}
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

      <Footer
        activeTab="Pendings"
        navigation={navigation}
        pendingCount={pendings.length}
      />
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
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  searchButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
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
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  deliveryCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
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
  overdueIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deliveryBadgeText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '600',
  },
  summaryNumber: {
    fontSize: 28,
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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC143C',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  actionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  purchaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  purchaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  purchaseDetails: {
    fontSize: 12,
    color: '#999',
  },
  purchaseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 2,
  },
  dueDateText: {
    fontSize: 11,
    color: '#666',
  },
  statusText: {
    fontSize: 11,
    color: '#FF9800',
  },
  purchaseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  remindBlueButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  remindBlueButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  invoiceButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  markPaidButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  markPaidText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pendingLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingRight: {
    alignItems: 'flex-end',
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  pendingPhone: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  pendingInvoice: {
    fontSize: 11,
    color: '#999',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 2,
  },
  pendingTime: {
    fontSize: 11,
    color: '#666',
  },
  pendingTimeSmall: {
    fontSize: 10,
    color: '#999',
  },
  pendingActions: {
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#FF6B6B',
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
});
