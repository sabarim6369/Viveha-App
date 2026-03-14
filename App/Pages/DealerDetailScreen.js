import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Footer from '../Components/Footer';
import {
  getDealerItems,
  getDealerLowStockItems,
  getDealerOrders,
  getDealerSummary,
  markDealerOrderDelivered,
  useNetworkStatus,
} from '../utils/NetworkManager';

export default function DealerDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { dealer } = route.params;
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  
  // Modal for marking order as delivered
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  
  // Modal for payment selection
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const dealerId = dealer.id || dealer.serverId || dealer._id;
      const [ordersData, summaryData] = await Promise.all([
        getDealerOrders(dealerId),
        getDealerSummary(dealerId),
      ]);
      
      setOrders(ordersData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading dealer data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dealer data',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkDelivered = (order) => {
    setSelectedOrder(order);
    setDeliveryAmount('');
    setDeliveryNote('');
    setDeliveryModalVisible(true);
  };

  const confirmMarkDelivered = async () => {
    if (!selectedOrder) return;

    if (!deliveryAmount || parseFloat(deliveryAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid bill amount');
      return;
    }

    setLoading(true);
    setDeliveryModalVisible(false);

    try {
      const result = await markDealerOrderDelivered(selectedOrder._id, {
        totalAmount: parseFloat(deliveryAmount),
        deliveryNote: deliveryNote
      });

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Order marked as delivered! Stock has been updated.',
        });
        loadData(); // Reload all data
      } else {
        Alert.alert('Error', result.error || 'Failed to mark order as delivered');
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      Alert.alert('Error', error.message || 'Failed to mark order as delivered');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = (order) => {
    setSelectedOrder(order);
    setPaymentModalVisible(true);
  };

  const handlePayFull = () => {
    if (!selectedOrder) return;
    setPaymentModalVisible(false);
    
    navigation.navigate('DealerPayment', {
      order: {
        ...selectedOrder,
        orderId: selectedOrder._id,
        dealer: dealer
      },
      dealer: dealer
    });
  };

  const handlePayPartial = () => {
    if (!selectedOrder) return;
    setPaymentModalVisible(false);
    
    // Navigate to payment screen - user can enter custom amount there
    navigation.navigate('DealerPayment', {
      order: {
        ...selectedOrder,
        orderId: selectedOrder._id,
        dealer: dealer,
        allowPartial: true
      },
      dealer: dealer
    });
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getOrderPaymentStatus = (order) => {
    if (!order.totalAmount) return { label: 'NO BILL', color: '#999', bg: '#F5F5F5' };
    
    // These would ideally come from backend, but for now we'll calculate
    const totalPaid = 0; // Would need to fetch payment history
    if (totalPaid === 0) return { label: 'UNPAID', color: '#F44336', bg: '#FFEBEE' };
    if (totalPaid < order.totalAmount) return { label: 'PARTIAL', color: '#FF9800', bg: '#FFF3E0' };
    return { label: 'PAID', color: '#4CAF50', bg: '#E8F5E9' };
  };

  const renderOrders = () => {
    if (orders.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={80} color="#E5E5E5" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Place your first order with this dealer</Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate('DealerInventory', { dealer })}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return orders.map((order) => {
      const isPending = order.status === 'pending';
      const isDelivered = order.status === 'delivered';
      const isExpanded = expandedOrders[order._id];
      const itemCount = order.items?.length || 0;

      return (
        <View key={order._id} style={styles.orderCard}>
          {/* Order Header */}
          <View style={styles.orderRow}>
            <View style={styles.orderLeft}>
              <View style={styles.orderHeaderRow}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: isPending ? '#FF9800' : isDelivered ? '#4CAF50' : '#999' }
                ]} />
                <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              </View>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
              <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            </View>
            
            <View style={styles.orderRight}>
              {order.totalAmount ? (
                <>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amountValue}>
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </>
              ) : (
                <View style={styles.noBillBadge}>
                  <Text style={styles.noBillText}>No Bill</Text>
                </View>
              )}
            </View>
          </View>

          {/* Expandable Items Section */}
          {itemCount > 0 && (
            <>
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => toggleOrderExpand(order._id)}
              >
                <Text style={styles.viewMoreText}>
                  {isExpanded ? 'Hide Items' : 'View Items'}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#7B68EE"
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.orderItem}>
                      <View style={styles.orderItemLeft}>
                        <Text style={styles.orderItemName}>{item.itemName || 'Item'}</Text>
                        <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                      </View>
                      {item.price && (
                        <Text style={styles.orderItemPrice}>
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Action Buttons Row */}
          {(isPending || (isDelivered && order.totalAmount)) && (
            <View style={styles.orderActionsRow}>
              {isPending && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.markDeliveredBtn]}
                  onPress={() => handleMarkDelivered(order)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
              {order.totalAmount && order.totalAmount > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.payButton, !isPending && styles.payButtonFull]}
                  onPress={() => handleMakePayment(order)}
                >
                  <Ionicons name="cash" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Pay</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{dealer.businessName || dealer.name}</Text>
          <Text style={styles.headerSubtitle}>#{dealer.phoneNumber?.slice(-5) || 'N/A'}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddDealer', { dealer })}
        >
          <Ionicons name="pencil" size={22} color="#E88494" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E88494']} />
        }
      >
        {/* Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Financial Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Ordered</Text>
                <Text style={[styles.summaryValue, { color: '#7B68EE' }]}>
                  Rs.{(summary.totalOrdered || 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                  Rs.{(summary.totalPaid || 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Payable</Text>
                <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                  Rs.{(summary.payable || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate('DealerInventory', { dealer })}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>Place New Order</Text>
          </TouchableOpacity>
        </View>

        {/* Orders Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order History</Text>
          <Text style={styles.sectionCount}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#E88494" style={{ marginTop: 40 }} />
          ) : (
            renderOrders()
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delivery Modal */}
      <Modal
        visible={deliveryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Order as Delivered</Text>
            <Text style={styles.modalSubtitle}>
              Order #{selectedOrder?.orderNumber}
            </Text>

            <Text style={styles.inputLabel}>Bill Amount (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter total bill amount"
              keyboardType="numeric"
              value={deliveryAmount}
              onChangeText={setDeliveryAmount}
            />

            <Text style={styles.inputLabel}>Delivery Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any delivery notes..."
              multiline
              numberOfLines={3}
              value={deliveryNote}
              onChangeText={setDeliveryNote}
            />

            <Text style={styles.warningText}>
              ⚠️ Stock quantities will be automatically incremented for all items in this order.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeliveryModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmMarkDelivered}
              >
                <Text style={styles.modalConfirmText}>Confirm Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Option Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentModalTitle}>Select Payment Option</Text>
            <Text style={styles.paymentModalSubtitle}>
              Order #{selectedOrder?.orderNumber}
            </Text>
            <Text style={styles.paymentModalAmount}>
              ₹{(selectedOrder?.totalAmount || 0).toLocaleString('en-IN')}
            </Text>

            <TouchableOpacity
              style={[styles.paymentOptionBtn, styles.payFullOptionBtn]}
              onPress={handlePayFull}
            >
              <View style={styles.paymentOptionLeft}>
                <Ionicons name="cash" size={24} color="#4CAF50" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Full Amount</Text>
                <Text style={styles.paymentOptionDesc}>
                  Pay the complete bill amount
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOptionBtn, styles.payPartialOptionBtn]}
              onPress={handlePayPartial}
            >
              <View style={styles.paymentOptionLeft}>
                <Ionicons name="card" size={24} color="#2196F3" />
              </View>
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Pay Partial Amount</Text>
                <Text style={styles.paymentOptionDesc}>
                  Pay a custom amount
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paymentModalCancelBtn}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.paymentModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Footer activeTab="Dealer" navigation={navigation} />
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
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  editButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#E88494',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  sectionCount: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E88494',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderLeft: {
    flex: 1,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 11,
    color: '#7B68EE',
    fontWeight: '600',
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E88494',
  },
  noBillBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noBillText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B68EE',
  },
  itemsList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  orderItemLeft: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  orderItemQty: {
    fontSize: 12,
    color: '#666',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  orderActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minWidth: 140,
  },
  markDeliveredBtn: {
    backgroundColor: '#4CAF50',
  },
  payButton: {
    backgroundColor: '#E88494',
  },
  payButtonFull: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#999',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
  },
  itemDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  lowStockText: {
    color: '#FF9800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Payment Modal Styles
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  paymentModalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  paymentModalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#E88494',
    marginBottom: 24,
    textAlign: 'center',
  },
  paymentOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  payFullOptionBtn: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  payPartialOptionBtn: {
    borderColor: '#2196F3',
    backgroundColor: '#EBF5FF',
  },
  paymentOptionLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: '#666',
  },
  paymentModalCancelBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    marginTop: 8,
  },
  paymentModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});
