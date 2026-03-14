import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus, createDealerOrder } from '../utils/NetworkManager';
import Toast from 'react-native-toast-message';

export default function DealerOrderReviewScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { dealer, items: initialItems, quantities: initialQuantities } = route.params;

    const [items, setItems] = useState(initialItems || []);
    const [quantities, setQuantities] = useState(initialQuantities || {});
    const [instructions, setInstructions] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate Total
    const totalAmount = items.reduce((sum, item) => {
        const qty = quantities[item._id || item.id || item.serverId] || 0;
        return sum + ((item.price || item.amount || 0) * qty);
    }, 0);

    const handleUpdateQty = (item, delta) => {
        const itemId = item._id || item.id || item.serverId;
        setQuantities(prev => {
            const current = prev[itemId] || 0;
            const newQty = Math.max(0, current + delta);
            if (newQty === 0) {
                setItems(currentItems => currentItems.filter(i => (i._id || i.id || i.serverId) !== itemId));
            }
            return { ...prev, [itemId]: newQty };
        });
    };

    const handlePlaceOrder = async () => {
        if (items.length === 0) {
            Alert.alert('Error', 'No items in order');
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                dealerId: dealer.id || dealer.serverId || dealer._id,
                items: items.map(item => ({
                    itemId: item._id || item.serverId || item.id,
                    quantity: quantities[item._id || item.id || item.serverId] || 0
                })),
                notes: '',
                deliveryInstructions: instructions,
                isUrgent: isUrgent,
                totalAmount: null, // Will be filled later when delivered
                dueDate: null
            };

            console.log('Order data being sent:', orderData);

            const result = await createDealerOrder(orderData);

            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Order placed successfully!',
                });

                // Navigate to Payment Screen with option to Pay Later
                setTimeout(() => {
                    navigation.navigate('DealerPayment', { 
                        order: {
                            ...result.order,
                            orderId: result.order._id,
                            dealer: dealer,
                            items: items.map(item => ({
                                ...item,
                                quantity: quantities[item.id || item.serverId] || 0
                            })),
                            totalAmount: totalAmount
                        },
                        dealer: dealer
                    });
                }, 500);
            } else {
                Alert.alert('Error', result.error || 'Failed to place order');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert('Error', error.message || 'Failed to place order');
        } finally {
            setIsSubmitting(false);
        }
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
                    <Text style={styles.headerTitle}>Order Review</Text>
                    <Text style={styles.headerSubtitle}>{dealer.businessName} (#{dealer.phoneNumber?.slice(-5)})</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Items Header */}
                <Text style={styles.sectionLabel}>Items ({items.length})</Text>

                {/* Item List */}
                <View style={styles.itemsContainer}>
                    {items.map((item, index) => {
                        const itemId = item._id || item.id || item.serverId;
                        const qty = quantities[itemId] || 0;
                        if (qty === 0) return null;

                        return (
                            <View key={itemId} style={styles.itemRow}>
                                <View style={styles.itemIcon}>
                                    <Ionicons name="construct-outline" size={20} color="#E88494" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemQty}>Qty: {qty}</Text>
                                </View>
                                <TouchableOpacity style={styles.editBtn}>
                                    <Ionicons name="create-outline" size={20} color="#7B68EE" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                {/* Delivery Instructions */}
                <Text style={styles.sectionLabel}>Delivery Instructions</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Gate code, drop-off location, etc..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    value={instructions}
                    onChangeText={setInstructions}
                    textAlignVertical="top"
                />

                {/* Urgent Switch */}
                <View style={styles.urgentContainer}>
                    <View style={styles.urgentInfo}>
                        <View style={styles.warnIcon}>
                            <Text style={styles.warnSymbol}>!</Text>
                        </View>
                        <View>
                            <Text style={styles.urgentTitle}>Urgent Order</Text>
                            <Text style={styles.urgentSubtitle}>Priority shipping applied</Text>
                        </View>
                    </View>
                    <Switch
                        trackColor={{ false: "#eee", true: "#E88494" }}
                        thumbColor={"#fff"}
                        onValueChange={() => setIsUrgent(!isUrgent)}
                        value={isUrgent}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Action */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.placeOrderBtn}
                    onPress={handlePlaceOrder}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.placeOrderText}>Place Order</Text>
                            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#F9F9F9',
    },
    closeButton: {
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
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        marginTop: 10,
    },
    itemsContainer: {
        // marginBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff', // Transparent in design? items seemed floating? sticking to cards
        // The design has items looking like rows without card bg, but let's give them structure
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 8,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FFE5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    itemQty: {
        fontSize: 12,
        color: '#E88494',
        fontWeight: '600',
    },
    editBtn: {
        padding: 8,
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        height: 100,
        fontSize: 14,
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    urgentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    urgentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warnIcon: {
        width: 4,
        height: 16,
        // Using text ! instead
        width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    warnSymbol: {
        color: '#FF3B30',
        fontWeight: '900',
        fontSize: 20,
    },
    urgentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    urgentSubtitle: {
        fontSize: 11,
        color: '#999',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    placeOrderBtn: {
        backgroundColor: '#E88494',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#E88494',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    placeOrderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
