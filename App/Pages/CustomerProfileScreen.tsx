import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    Share,
    Image,
    Modal,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SyncIndicator from '../Components/SyncIndicator';
import { 
  getCustomerProfile,
  useNetworkStatus,
  getPendingSyncItems
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

interface CustomerProfileScreenProps {
    navigation: any;
    route: any;
}

interface Invoice {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    createdAt: string;
}

interface Payment {
    _id: string;
    amount: number;
    method: string;
    paidAt: string;
    note?: string;
}

interface Customer {
    _id: string;
    name: string;
    phoneNumber: string;
    address?: string;
    emailId?: string;
    gstNo?: string;
}

interface ProfileData {
    customer: Customer;
    pendingInvoices: Invoice[];
    paidInvoices: Invoice[];
    totalBalance: number;
    payments: Payment[];
    statistics: {
        totalPendingInvoices: number;
        totalPaidInvoices: number;
        totalInvoices: number;
        totalAmountPaid: number;
    };
}

export default function CustomerProfileScreen({ navigation, route }: CustomerProfileScreenProps): React.JSX.Element {
    const { customerId, customerName } = route.params;
    const insets = useSafeAreaInsets();
    
    // Network status monitoring
    const { isConnected, isInternetReachable } = useNetworkStatus();
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);

    useEffect(() => {
        loadCustomerProfile();
        updatePendingSyncCount();
    }, [customerId]);

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

    const loadCustomerProfile = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const isOffline = !isConnected || !isInternetReachable;
            
            if (isOffline) {
                Toast.show({
                    type: 'info',
                    text1: 'Offline Mode',
                    text2: 'Customer profile requires internet',
                    position: 'bottom',
                });
                Alert.alert(
                    'Offline Mode',
                    'Customer profile details require an internet connection. Please connect to view.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                return;
            }
            
            const data = await getCustomerProfile(customerId);
            setProfileData(data);
        } catch (error: any) {
            console.error('Error loading customer profile:', error);
            Alert.alert('Error', 'Failed to load customer profile');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = date.getFullYear();
        
        return `${month} ${day}, ${year}`;
    };

    const formatBillDate = (dateString: string): string => {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (amount: number): string => {
        return `Rs.${amount.toLocaleString('en-IN')}`;
    };

    const getShareMessage = (): string => {
        if (!profileData) return '';

        const { customer, pendingInvoices, totalBalance, payments } = profileData;
        const firstInvoice = pendingInvoices.length > 0 ? pendingInvoices[0] : null;

        return `*${customer.name}*
Invoice No: ${firstInvoice?.invoiceNumber || 'N/A'}

*INVOICE FOR*
${customer.name}
${customer.address || ''}
Phone: ${customer.phoneNumber}

*AMOUNT DUE*
${formatCurrency(totalBalance)}
${firstInvoice?.dueDate ? formatDate(firstInvoice.dueDate) : ''}

*BILLS*
${payments && payments.length > 0 ? payments.map((payment, index) => 
    `Bill ${index + 1} - ${formatBillDate(payment.paidAt)}  ${formatCurrency(payment.amount)}`
).join('\n') : 'No bills yet'}

*TOTAL AMOUNT*
${formatCurrency(totalBalance)}

Friendly reminder from JK TRADERS: You have a balance of ${formatCurrency(totalBalance)} remaining. Tap below to mark as paid!`;
    };

    const handleShare = (): void => {
        setShareModalVisible(true);
    };

    const handleShareWhatsApp = async (): Promise<void> => {
        const message = getShareMessage();
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                setShareModalVisible(false);
            } else {
                Alert.alert('Error', 'WhatsApp is not installed');
            }
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            Alert.alert('Error', 'Failed to open WhatsApp');
        }
    };

    const handleShareMessenger = async (): Promise<void> => {
        const message = getShareMessage();
        const url = `fb-messenger://share?text=${encodeURIComponent(message)}`;
        
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                setShareModalVisible(false);
            } else {
                Alert.alert('Error', 'Messenger is not installed');
            }
        } catch (error) {
            console.error('Error opening Messenger:', error);
            Alert.alert('Error', 'Failed to open Messenger');
        }
    };

    const handleCopyUrl = async (): Promise<void> => {
        const message = getShareMessage();
        try {
            await Share.share({ message });
            Toast.show({
                type: 'success',
                text1: 'Copied',
                text2: 'Invoice details ready to share',
                position: 'bottom',
            });
            setShareModalVisible(false);
        } catch (error) {
            console.error('Error copying:', error);
        }
    };

    const handleShareMore = async (): Promise<void> => {
        const message = getShareMessage();
        try {
            await Share.share({ message });
            setShareModalVisible(false);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleSaveAndPrint = (): void => {
        Alert.alert('Save & Print', 'This feature will be implemented soon');
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88E99" />
                    <Text style={styles.loadingText}>Loading customer profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!profileData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
                    <Text style={styles.errorText}>Failed to load customer profile</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadCustomerProfile}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { customer, pendingInvoices, paidInvoices, totalBalance, statistics } = profileData;

    return (
        <View style={styles.container}>
            {/* White Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.logoContainer}>
                    <Ionicons name="cube" size={24} color="#E88E99" />
                </View>
                <Text style={styles.headerTitle}>Customer Profile</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Customer Card */}
                <View style={styles.customerCard}>
                    {/* Card Header Icons */}
                    <View style={styles.cardHeaderIcons}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cardIconButton}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.cardHeaderRight}>
                            <TouchableOpacity style={styles.cardIconButton}>
                                <Ionicons name="create-outline" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cardIconButton}>
                                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {/* Customer Name and Invoice Info */}
                    <View style={styles.customerHeader}>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        <Text style={styles.invoiceNumber}>
                            Invoice No: {pendingInvoices.length > 0 ? pendingInvoices[0].invoiceNumber : 'N/A'}
                        </Text>
                    </View>

                    {/* Customer Details Box */}
                    <View style={styles.detailsBox}>
                        <View style={styles.detailsLeft}>
                            <Text style={styles.detailsLabel}>INVOICE FOR</Text>
                            <Text style={styles.detailsName}>{customer.name}</Text>
                            {customer.address && (
                                <Text style={styles.detailsText}>{customer.address}</Text>
                            )}
                            <Text style={styles.detailsText}>Phone: {customer.phoneNumber}</Text>
                        </View>
                        <View style={styles.detailsRight}>
                            <Text style={styles.detailsLabel}>AMOUNT DUE</Text>
                            <Text style={styles.amountDue}>{formatCurrency(totalBalance)}</Text>
                            {pendingInvoices.length > 0 && pendingInvoices[0].dueDate && (
                                <Text style={styles.dueDate}>
                                    {formatDate(pendingInvoices[0].dueDate)}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Bills Section - Show payments made */}
                    {profileData.payments && profileData.payments.length > 0 && (
                        <View style={styles.billsSection}>
                            <View style={styles.billsHeader}>
                                <Text style={styles.billsLabel}>BILLS</Text>
                                <Text style={styles.billsLabel}>TOTAL</Text>
                            </View>
                            {profileData.payments.map((payment, index) => (
                                <View key={payment._id} style={styles.billRow}>
                                    <Text style={styles.billText}>
                                        Bill {index + 1} - {formatBillDate(payment.paidAt)}
                                    </Text>
                                    <Text style={styles.billAmount}>
                                        {formatCurrency(payment.amount)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* No Bills Message - Show only when there are no payments */}
                    {(!profileData.payments || profileData.payments.length === 0) && (
                        <View style={styles.noBillsSection}>
                            <Ionicons name="receipt-outline" size={48} color="#fff" />
                            <Text style={styles.noBillsText}>No Bills Yet</Text>
                            <Text style={styles.noBillsSubtext}>No payments recorded for this customer</Text>
                        </View>
                    )}

                    {/* Notes Section - Only show if there is a pending balance */}
                    {totalBalance > 0 && (
                        <View style={styles.notesSection}>
                            <View style={styles.notesHeader}>
                                <Text style={styles.notesLabel}>NOTES</Text>
                                <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                            </View>
                            <View style={styles.notesContent}>
                                <Text style={styles.notesText}>
                                    Friendly reminder from JK TRADERS: You have a balance of{' '}
                                    <Text style={styles.notesAmount}>{formatCurrency(totalBalance)}</Text>{' '}
                                    remaining. Tap below to mark as paid!
                                </Text>
                                <Text style={styles.totalAmount}>{formatCurrency(totalBalance)}</Text>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndPrint}>
                            <Ionicons name="save-outline" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Save & Print</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="download-outline" size={20} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                            <Ionicons name="share-social-outline" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            
            {/* Share Modal */}
            <Modal
                visible={shareModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.shareModalOverlay}>
                    <View style={styles.shareModalContent}>
                        {/* Header */}
                        <View style={styles.shareModalHeader}>
                            <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.shareModalTitle}>Share</Text>
                            <View style={styles.shareModalSpacer} />
                        </View>

                        {/* Customer Card Preview */}
                        <ScrollView 
                            style={styles.sharePreviewScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.sharePreview}>
                                <View style={styles.shareCustomerCard}>
                                    <Text style={styles.shareWatermark}>Viveha.ai</Text>
                                    
                                    <View style={styles.customerHeader}>
                                        <Text style={styles.customerName}>{customer.name}</Text>
                                        <Text style={styles.invoiceNumber}>
                                            Invoice No: {pendingInvoices.length > 0 ? pendingInvoices[0].invoiceNumber : 'N/A'}
                                        </Text>
                                    </View>

                                    <View style={styles.detailsBox}>
                                        <View style={styles.detailsLeft}>
                                            <Text style={styles.detailsLabel}>INVOICE FOR</Text>
                                            <Text style={styles.detailsName}>{customer.name}</Text>
                                            {customer.address && (
                                                <Text style={styles.detailsText}>{customer.address}</Text>
                                            )}
                                            <Text style={styles.detailsText}>Phone: {customer.phoneNumber}</Text>
                                        </View>
                                        <View style={styles.detailsRight}>
                                            <Text style={styles.detailsLabel}>AMOUNT DUE</Text>
                                            <Text style={styles.amountDue}>{formatCurrency(totalBalance)}</Text>
                                            {pendingInvoices.length > 0 && pendingInvoices[0].dueDate && (
                                                <Text style={styles.dueDate}>
                                                    {formatDate(pendingInvoices[0].dueDate)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Bills Section in Share Modal - Show payments made */}
                                    {profileData.payments && profileData.payments.length > 0 && (
                                        <View style={styles.billsSection}>
                                            <View style={styles.billsHeader}>
                                                <Text style={styles.billsLabel}>BILLS</Text>
                                                <Text style={styles.billsLabel}>TOTAL</Text>
                                            </View>
                                            {profileData.payments.map((payment, index) => (
                                                <View key={payment._id} style={styles.billRow}>
                                                    <Text style={styles.billText}>
                                                        Bill {index + 1} - {formatBillDate(payment.paidAt)}
                                                    </Text>
                                                    <Text style={styles.billAmount}>
                                                        {formatCurrency(payment.amount)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* No Bills Message in Share Modal */}
                                    {(!profileData.payments || profileData.payments.length === 0) && (
                                        <View style={styles.noBillsSection}>
                                            <Ionicons name="receipt-outline" size={48} color="#fff" />
                                            <Text style={styles.noBillsText}>No Bills Yet</Text>
                                            <Text style={styles.noBillsSubtext}>No payments recorded for this customer</Text>
                                        </View>
                                    )}

                                    {/* Notes Section in Share Modal - Only show if there is a pending balance */}
                                    {totalBalance > 0 && (
                                        <View style={styles.notesSection}>
                                            <View style={styles.notesHeader}>
                                                <Text style={styles.notesLabel}>NOTES</Text>
                                                <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                                            </View>
                                            <View style={styles.notesContent}>
                                                <Text style={styles.notesText}>
                                                    Friendly reminder from JK TRADERS: You have a balance of{' '}
                                                    <Text style={styles.notesAmount}>{formatCurrency(totalBalance)}</Text>{' '}
                                                    remaining. Tap below to mark as paid!
                                                </Text>
                                                <Text style={styles.totalAmount}>{formatCurrency(totalBalance)}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Share Options */}
                        <View style={styles.shareOptions}>
                            <TouchableOpacity style={styles.shareOption} onPress={handleCopyUrl}>
                                <View style={styles.shareOptionIcon}>
                                    <Ionicons name="link" size={24} color="#fff" />
                                </View>
                                <Text style={styles.shareOptionText}>Copy url</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.shareOption} onPress={handleShareMessenger}>
                                <View style={[styles.shareOptionIcon, styles.messengerIcon]}>
                                    <Ionicons name="logo-facebook" size={24} color="#fff" />
                                </View>
                                <Text style={styles.shareOptionText}>Messenger</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.shareOption} onPress={handleShareWhatsApp}>
                                <View style={[styles.shareOptionIcon, styles.whatsappIcon]}>
                                    <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                                </View>
                                <Text style={styles.shareOptionText}>WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.shareOption} onPress={handleShareMore}>
                                <View style={styles.shareOptionIcon}>
                                    <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                                </View>
                                <Text style={styles.shareOptionText}>More</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Footer navigation={navigation} activeTab="Pendings" />
        </View>
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
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    logoContainer: {
        width: 32,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 32,
    },
    cardHeaderIcons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardHeaderRight: {
        flexDirection: 'row',
        gap: 10,
    },
    cardIconButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginTop: 15,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#E88E99',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    customerCard: {
        backgroundColor: '#E88E99',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    customerHeader: {
        marginBottom: 12,
    },
    customerName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    invoiceNumber: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.85,
    },
    detailsBox: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailsLeft: {
        flex: 1,
    },
    detailsRight: {
        alignItems: 'flex-end',
    },
    detailsLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#999',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    detailsName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        marginBottom: 3,
    },
    detailsText: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
    },
    amountDue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#E88E99',
        marginBottom: 3,
    },
    dueDate: {
        fontSize: 10,
        color: '#E88E99',
        fontWeight: '600',
    },
    billsSection: {
        marginBottom: 12,
    },
    billsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    billsLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    billText: {
        fontSize: 13,
        color: '#fff',
    },
    billAmount: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    noBillsSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        marginBottom: 12,
    },
    noBillsText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginTop: 12,
        marginBottom: 4,
    },
    noBillsSubtext: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.8,
    },
    notesSection: {
        marginBottom: 12,
    },
    notesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    notesLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    notesContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    notesText: {
        flex: 1,
        fontSize: 11,
        color: '#fff',
        lineHeight: 16,
        marginRight: 12,
    },
    notesAmount: {
        fontWeight: '700',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF7043',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    iconButton: {
        width: 44,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-start',
    },
    shareModalContent: {
        flex: 1,
        paddingTop: 40,
    },
    shareModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    shareModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    shareModalSpacer: {
        width: 24,
    },
    sharePreviewScroll: {
        flex: 1,
    },
    sharePreview: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    shareCustomerCard: {
        backgroundColor: '#E88E99',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
    },
    shareWatermark: {
        position: 'absolute',
        top: 16,
        right: 16,
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 1,
    },
    shareOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingVertical: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    shareOption: {
        alignItems: 'center',
        gap: 8,
    },
    shareOptionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messengerIcon: {
        backgroundColor: '#0084FF',
    },
    whatsappIcon: {
        backgroundColor: '#25D366',
    },
    shareOptionText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
});