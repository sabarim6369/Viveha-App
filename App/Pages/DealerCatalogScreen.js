import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../Components/Footer';
import {
  getDealers,
  getDealerItems,
  getDealerSummary,
  useNetworkStatus,
} from '../utils/NetworkManager';

export default function DealerCatalogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dealers, setDealers] = useState([]);
  const [dealerItems, setDealerItems] = useState({}); // Map of dealerId -> items[]
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    setLoading(true);
    try {
      const fetchedDealers = await getDealers();
      setDealers(fetchedDealers);

      // Load items for each dealer
      const itemsMap = {};
      await Promise.all(
        fetchedDealers.map(async (dealer) => {
          const dealerId = dealer._id || dealer.id || dealer.serverId;
          const items = await getDealerItems(dealerId);
          itemsMap[dealerId] = items.slice(0, 2); // Show only first 2 items
        })
      );
      setDealerItems(itemsMap);
    } catch (error) {
      console.error('Error loading dealers:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDealers();
    setRefreshing(false);
  };

  const getTotalValue = () => {
    let total = 0;
    Object.keys(dealerItems).forEach((dealerId) => {
      const items = dealerItems[dealerId] || [];
      items.forEach((item) => {
        total += (item.price || item.amount || 0) * (item.stock || 0);
      });
    });
    return total;
  };

  const getTotalItems = () => {
    let total = 0;
    Object.keys(dealerItems).forEach((dealerId) => {
      total += (dealerItems[dealerId] || []).length;
    });
    return total;
  };

  const handleAddDealer = () => {
    navigation.navigate('AddDealer');
  };

  const handleDealerDetails = (dealer) => {
    navigation.navigate('DealerDetail', { dealer });
  };

  const handleEditDealer = (dealer) => {
    navigation.navigate('AddDealer', { dealer });
  };

  const filteredDealers = dealers.filter((dealer) => {
    const matchesSearch = dealer.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#C4C4C4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dealer Catalog</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddDealer}>
          <Ionicons name="add" size={28} color="#C4C4C4" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dealers or parts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            All Dealers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'high' && styles.filterTabActive]}
          onPress={() => setActiveFilter('high')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'high' && styles.filterTabTextActive]}>
            High Balance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'recent' && styles.filterTabActive]}
          onPress={() => setActiveFilter('recent')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'recent' && styles.filterTabTextActive]}>
            Recent Orders
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E88E99" />
            <Text style={styles.loadingText}>Loading dealers...</Text>
          </View>
        ) : filteredDealers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {dealers.length === 0 ? 'No dealers yet' : 'No matching dealers'}
            </Text>
            <Text style={styles.emptySubtext}>
              {dealers.length === 0 ? 'Add your first dealer to get started' : 'Try a different search'}
            </Text>
          </View>
        ) : (
          <>
            {filteredDealers.map((dealer) => {
              const dealerId = dealer._id || dealer.id || dealer.serverId;
              return (
              <TouchableOpacity
                key={dealerId}
                style={styles.dealerCard}
                onPress={() => handleDealerDetails(dealer)}
              >
                {/* Dealer Header */}
                <View style={styles.dealerHeader}>
                  <View style={styles.dealerInfo}>
                    <View style={styles.dealerLogo}>
                      <Ionicons name="storefront" size={24} color="#fff" />
                    </View>
                    <View style={styles.dealerNameContainer}>
                      <Text style={styles.dealerName}>{dealer.businessName || dealer.name}</Text>
                      <Text style={styles.dealerId}>
                        {dealer.phoneNumber || 'No phone'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleEditDealer(dealer)}>
                    <Ionicons name="create-outline" size={22} color="#7B68EE" />
                  </TouchableOpacity>
                </View>

                {/* Dealer Info */}
                <View style={styles.dealerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>CONTACT PERSON</Text>
                    <Text style={styles.statValue}>
                      {dealer.contactPerson || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, styles.statLabelRight]}>ITEMS</Text>
                    <Text style={[styles.statValue, styles.statValueBalance]}>
                      {(dealerItems[dealerId] || []).length} items
                    </Text>
                  </View>
                </View>

                {/* Products Section */}
                {(dealerItems[dealerId] || []).length > 0 && (
                  <View style={styles.productsSection}>
                    {(dealerItems[dealerId] || []).map((item, index) => (
                      <View key={index} style={styles.productRow}>
                        <View style={styles.productLeft}>
                          <Text style={styles.productLabel}>Product Info</Text>
                          <Text style={styles.productName}>{item.name}</Text>
                          <Text style={styles.productBill}>
                            {item.description || 'No description'}
                          </Text>
                        </View>
                        <View style={styles.productRight}>
                          <Text style={[styles.productLabel, styles.productLabelRight]}>Stock & Price</Text>
                          <Text style={styles.productPrice}>
                            Rs.{(item.price || item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.productStock}>{item.stock || 0} {item.unit || 'nos'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* View All Products Link */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDealerDetails(dealer);
                    }}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#7B68EE" />
                    <Text style={styles.quickActionText}>View Orders</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('DealerInventory', { dealer });
                    }}
                  >
                    <Ionicons name="cart-outline" size={18} color="#E88E99" />
                    <Text style={styles.quickActionText}>Place Order</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              );
            })}
            <View style={{ height: 180 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL VALUE</Text>
              <Text style={styles.summaryAmount}>
                Rs.{getTotalValue().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.summaryIconContainer}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calculator" size={20} color="#fff" />
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL ITEMS</Text>
              <Text style={styles.summaryAmount}>
                {getTotalItems()} Items
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
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
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 5,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E88494',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: '#FFE5E9',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#E88494',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dealerCard: {
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
  dealerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dealerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dealerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E88494',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealerNameContainer: {
    flex: 1,
  },
  dealerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  dealerId: {
    fontSize: 12,
    color: '#999',
  },
  dealerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statLabelRight: {
    textAlign: 'right',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statValueBalance: {
    color: '#4A90E2',
    textAlign: 'right',
  },
  productsSection: {
    paddingTop: 12,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productLeft: {
    flex: 1,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  productLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  productLabelRight: {
    textAlign: 'right',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  productBill: {
    fontSize: 11,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 11,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  viewAllContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#7B68EE',
    fontWeight: '600',
  },
  summaryContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#E88494',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  summaryIconContainer: {
    paddingHorizontal: 16,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
});
