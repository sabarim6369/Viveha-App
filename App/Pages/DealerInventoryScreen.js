import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    TextInput,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../Components/Footer';
import {
    getDealerItems,
    useNetworkStatus,
} from '../utils/NetworkManager';

export default function DealerInventoryScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { dealer } = route.params;
    const { isConnected } = useNetworkStatus();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, low-stock, recent

    const [cart, setCart] = useState({}); // { itemId: quantity }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const dealerId = dealer.id || dealer.serverId;
            const fetchedItems = await getDealerItems(dealerId);
            setItems(fetchedItems);
        } catch (error) {
            console.error('Error loading dealer items:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateCart = (item, delta) => {
        setCart(prev => {
            // Use _id from backend items
            const itemId = item._id || item.serverId || item.id;

            // Safety check
            if (!itemId) {
                console.warn("Item missing ID in updateCart", item);
                return prev;
            }

            const currentQty = prev[itemId] || 0;
            const newQty = Math.max(0, currentQty + delta);

            const newCart = { ...prev };
            if (newQty === 0) {
                delete newCart[itemId];
            } else {
                newCart[itemId] = newQty;
            }
            return newCart;
        });
    };

    const getFilteredItems = () => {
        let filtered = items;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.groupName && item.groupName.toLowerCase().includes(query))
            );
        }

        // Filter by tab
        if (activeFilter === 'low-stock') {
            filtered = filtered.filter(item => (item.stock || 0) <= 5);
        }
        // 'recent' filter would require createdAt which might not be reliable on items, skipping for now or mapped to 'all'

        return filtered;
    };

    const filteredItems = getFilteredItems();
    const cartItemCount = Object.keys(cart).length;
    const cartTotalAmount = Object.keys(cart).reduce((sum, itemId) => {
        const item = items.find(i => (i._id || i.id || i.serverId) === itemId);
        const qty = cart[itemId] || 0;
        return sum + ((item?.price || item?.amount || 0) * qty);
    }, 0);

    const getStockStatus = (stock) => {
        if (!stock || stock <= 0) return { label: 'OUT OF STOCK', color: '#F44336', bg: '#FFEBEE' };
        if (stock <= 5) return { label: 'LOW STOCK', color: '#FF9800', bg: '#FFF3E0' };
        return { label: 'IN STOCK', color: '#4CAF50', bg: '#E8F5E9' };
    };

    const renderItem = ({ item }) => {
        const status = getStockStatus(item.stock);
        const itemId = item._id || item.id || item.serverId;
        const qty = cart[itemId] || 0;

        return (
            <View style={styles.row}>
                {/* Product Name & Code */}
                <View style={[styles.cell, { flex: 2, paddingLeft: 16 }]}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.hsnCode}>HSN Code: {item.hsnCode || '1234'}</Text>
                </View>

                {/* Dealer/Group (Using Group as brand proxy) */}
                <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                {/* Price */}
                <View style={[styles.cell, { flex: 0.8, alignItems: 'flex-end' }]}>
                    <Text style={styles.price}>
                        Rs.{(item.price || item.amount || 0).toFixed(0)}
                    </Text>
                </View>

                {/* Add Actions */}
                <View style={[styles.cell, { flex: 1.5, alignItems: 'flex-end', paddingRight: 16 }]}>
                    {qty > 0 ? (
                        <View style={styles.qtyContainer}>
                            <TouchableOpacity onPress={() => updateCart(item, -1)} style={styles.qtyBtn}>
                                <Ionicons name="remove" size={16} color="#E88494" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <TouchableOpacity onPress={() => updateCart(item, 1)} style={styles.qtyBtn}>
                                <Ionicons name="add" size={16} color="#E88494" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => updateCart(item, 1)}>
                            <Text style={styles.addBtnText}>ADD +</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

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
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Product Inventory</Text>
                    <Text style={styles.headerSubtitle}>{dealer.businessName} (#{dealer.phoneNumber?.slice(-5) || 'N/A'})</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={28} color="#C4C4C4" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search SKU or Product..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="options" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterTabs}>
                <TouchableOpacity
                    style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                    onPress={() => setActiveFilter('all')}
                >
                    <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                        All Items
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, activeFilter === 'low-stock' && styles.filterTabActive]}
                    onPress={() => setActiveFilter('low-stock')}
                >
                    <Text style={[styles.filterTabText, activeFilter === 'low-stock' && styles.filterTabTextActive]}>
                        Low Stock
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

            {/* Table Header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { flex: 2, paddingLeft: 16 }]}>Product Name</Text>
                <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>Dealer</Text>
                <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>Stock Status</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'right', paddingRight: 16 }]}>Price</Text>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88494" />
                    <Text style={styles.loadingText}>Loading inventory...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id || item.id || item.serverId || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No items found</Text>
                        </View>
                    }
                />
            )}

            {/* Review Order Button */}
            {cartItemCount > 0 && (
                <View style={styles.bottomPanel}>
                    <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => navigation.navigate('DealerOrderReview', {
                            dealer,
                            items: items.filter(i => cart[i._id || i.id || i.serverId]),
                            quantities: cart
                        })}
                    >
                        <View style={styles.reviewInfo}>
                            <Text style={styles.reviewCount}>{cartItemCount} Items Selected</Text>
                            <Text style={styles.reviewTotal}>Total: Rs.{cartTotalAmount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.reviewAction}>
                            <Text style={styles.reviewText}>Review Order</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

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
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
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
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
    },
    filterTabActive: {
        backgroundColor: '#E88494',
        borderColor: '#E88494',
    },
    filterTabText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    filterTabTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#E88494',
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    headerText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    row: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    cell: {
        justifyContent: 'center',
    },
    productName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    hsnCode: {
        fontSize: 10,
        color: '#999',
    },
    dealerName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    partNo: {
        fontSize: 10,
        color: '#999',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
    },
    price: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#999',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E88494',
        borderRadius: 6,
        height: 28,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000',
        minWidth: 20,
        textAlign: 'center',
    },
    addBtn: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E88494',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#E88494',
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 80, // Above Footer
        left: 16,
        right: 16,
    },
    reviewButton: {
        backgroundColor: '#E88494',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    reviewInfo: {
        flexDirection: 'column',
    },
    reviewCount: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    reviewTotal: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        marginTop: 2,
    },
    reviewAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
});
