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
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus, createDealerPayment } from '../utils/NetworkManager';
import Toast from 'react-native-toast-message';

export default function DealerPaymentScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { order, dealer } = route.params || {};

    // Use order total, partial amount, or default to empty
    const initialAmount = order 
        ? (order.partialAmount 
            ? order.partialAmount.toString() 
            : (order.totalAmount || 0).toString()
          )
        : '';
    const displayDealer = order ? order.dealer : dealer;

    const [amount, setAmount] = useState(initialAmount);
    const [method, setMethod] = useState('cash');
    const [date, setDate] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSettlement = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
            return;
        }

        setIsSubmitting(true);

        try {
            const paymentData = {
                dealerId: displayDealer.id || displayDealer.serverId,
                orderId: order ? (order.orderId || order._id || order.id) : null,
                amount: parseFloat(amount),
                method: method,
                note: notes,
                paidAt: date.toISOString()
            };

            const result = await createDealerPayment(paymentData);

            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Payment Recorded',
                    text2: `Rs.${parseFloat(amount).toLocaleString()} payment recorded successfully!`,
                });
                
                setTimeout(() => {
                    navigation.navigate('DealerCatalog');
                }, 1000);
            } else {
                Alert.alert('Error', result.error || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Payment error:', error);
            Alert.alert('Error', error.message || 'An error occurred while recording payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayLater = () => {
        Alert.alert(
            'Pay Later',
            'Order has been placed. You can make the payment anytime from the dealer details screen.',
            [
                { text: 'OK', onPress: () => navigation.navigate('DealerCatalog') }
            ]
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
                <Text style={styles.headerTitle}>Payment Settlement</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Dealer Card */}
                <View style={styles.dealerCard}>
                    <View style={styles.dealerHeader}>
                        <View style={styles.dealerIcon}>
                            <Ionicons name="storefront" size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dealerName}>{displayDealer?.businessName || 'Unknown Dealer'}</Text>
                            <Text style={styles.dealerId}>ID: #{displayDealer?.phoneNumber?.slice(-5) || '0000'}</Text>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="create-outline" size={20} color="#7B68EE" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.dealerFooter}>
                        <View>
                            <Text style={styles.labelSmall}>LAST PURCHASE</Text>
                            <Text style={styles.amountSmall}>Rs. {order?.totalAmount?.toLocaleString() || '0.00'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.labelSmall}>Due Date</Text>
                            <Text style={styles.dateSmall}>Feb 15, 2026</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Amount */}
                <Text style={styles.sectionLabel}>Payment Amount</Text>
                <View style={styles.amountInputContainer}>
                    <Text style={styles.currency}>Rs. </Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                    />
                </View>

                {/* Method & Date */}
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.sectionLabel}>Method</Text>
                        <TouchableOpacity style={styles.dropdown}>
                            <Text style={styles.dropdownText}>{method}</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.sectionLabel}>Date</Text>
                        <TouchableOpacity style={styles.dropdown}>
                            <Text style={styles.dropdownText}>14/02/2026</Text>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Attach Receipt */}
                <Text style={styles.sectionLabel}>Attach Receipt</Text>
                <TouchableOpacity style={styles.receipeBox}>
                    <View style={styles.cameraIcon}>
                        <Ionicons name="camera-outline" size={24} color="#999" />
                    </View>
                    <Text style={styles.uploadTitle}>Upload screenshot or photo</Text>
                    <Text style={styles.uploadSubtitle}>Supports JPG, PNG up to 5MB</Text>
                </TouchableOpacity>

                {/* Notes */}
                <Text style={styles.sectionLabel}>Notes (Optional)</Text>
                <TextInput
                    style={styles.notesInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#999"
                    value={notes}
                    onChangeText={setNotes}
                />

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handlePayLater}
                    disabled={isSubmitting}
                >
                    <Text style={styles.skipText}>Pay Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleSettlement}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <View style={styles.checkIcon}>
                                <Ionicons name="checkmark" size={16} color="#E88494" />
                            </View>
                            <Text style={styles.confirmText}>Confirm Settlement</Text>
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
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    dealerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dealerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dealerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E88494',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dealerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    dealerId: {
        fontSize: 12,
        color: '#999',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 16,
    },
    dealerFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    labelSmall: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    amountSmall: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E88494',
    },
    dateSmall: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
    },
    currency: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
    },
    amountInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    receipeBox: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        marginBottom: 20,
        marginTop: 4,
    },
    cameraIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EAEAEA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadTitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontSize: 11,
        color: '#999',
    },
    notesInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        color: '#333',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
    },
    skipBtn: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E88494',
    },
    skipText: {
        color: '#E88494',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1.5,
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
    checkIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
