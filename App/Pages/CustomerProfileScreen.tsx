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
    Modal,
    Linking,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
    getCustomerProfile,
    useNetworkStatus,
    getPendingSyncItems,
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const ROSE = '#E46269';   // coral card header bg
const ORANGE = '#F07C3A';   // Save & Print button

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CustomerProfileScreenProps { 
    navigation: any; 
    route: { 
        params: { 
            customerId: string; 
            specificInvoiceId?: string; 
            specificInvoiceNumber?: string;
        }; 
    }; 
}

interface Invoice {
    _id: string; invoiceNumber: string; invoiceDate: string;
    dueDate: string; totalAmount: number; paidAmount: number; createdAt: string;
}
interface Payment {
    _id: string; invoiceId: string; amount: number; method: string; paidAt: string; note?: string;
}
interface Customer {
    _id: string; name: string; phoneNumber: string;
    address?: string; emailId?: string; gstNo?: string;
}
interface ProfileData {
    customer: Customer; pendingInvoices: Invoice[];
    paidInvoices: Invoice[]; totalBalance: number; payments: Payment[];
    statistics: { totalPendingInvoices: number; totalPaidInvoices: number; totalInvoices: number; totalAmountPaid: number; };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CustomerProfileScreen({ navigation, route }: CustomerProfileScreenProps): React.JSX.Element {
    const { customerId, specificInvoiceId, specificInvoiceNumber } = route.params;
    const insets = useSafeAreaInsets();

    const { isConnected, isInternetReachable } = useNetworkStatus();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [filteredData, setFilteredData] = useState<ProfileData | null>(null);
    const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
    const [shopName, setShopName] = useState<string>('My Shop');

    useEffect(() => { 
        loadCustomerProfile();
        loadShopDetails();
    }, [customerId]);

    useEffect(() => {
        if (isConnected && isInternetReachable) {
            (async () => {
                const pending = await getPendingSyncItems().catch(() => []);
                // sync check handled by SyncIndicator globally
            })();
        }
    }, [isConnected, isInternetReachable]);

    // ── Load shop details ────────────────────────────────────────────────────────
    const loadShopDetails = async (): Promise<void> => {
        try {
            const shopDetails = await AsyncStorage.getItem('@viveha_shop_details');
            if (shopDetails) {
                const details = JSON.parse(shopDetails);
                setShopName(details.shopName || 'My Shop');
            }
        } catch (error) {
            console.error('Error loading shop details:', error);
        }
    };

    // ── Data loading ──────────────────────────────────────────────────────────
    const loadCustomerProfile = async (): Promise<void> => {
        try {
            setIsLoading(true);
            let data: ProfileData | null = null;
            let loadedFromCache = false;
            
            // Try to fetch from API if online
            if (isConnected && isInternetReachable) {
                try {
                    data = await getCustomerProfile(customerId);
                    // Cache the data for offline use
                    await AsyncStorage.setItem(`@viveha_customer_profile_${customerId}`, JSON.stringify(data));
                } catch (apiError) {
                    console.log('API fetch failed, trying cache...', apiError);
                    // Fall through to try cache
                }
            }
            
            // If API fetch failed or we're offline, try cache
            if (!data) {
                const cachedData = await AsyncStorage.getItem(`@viveha_customer_profile_${customerId}`);
                if (cachedData) {
                    data = JSON.parse(cachedData);
                    loadedFromCache = true;
                }
            }
            
            // If we still don't have data, show error
            if (!data) {
                Toast.show({ type: 'error', text1: 'No data available', text2: 'Please check your connection', position: 'bottom' });
                Alert.alert('Error', 'Failed to load customer profile. Please check your connection and try again.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
                return;
            }
            
            // Set the profile data
            setProfileData(data);
            
            // If specificInvoiceId is provided, filter data to show only that invoice
            if (specificInvoiceId) {
                const specificInvoice = data.pendingInvoices.find(
                    (inv) => inv._id === specificInvoiceId || inv.invoiceNumber === specificInvoiceNumber
                );
                
                if (specificInvoice) {
                    // Filter payments that belong ONLY to this specific invoice
                    const invoicePayments = data.payments.filter((payment) => {
                        return payment.invoiceId === specificInvoiceId;
                    });
                    
                    setFilteredData({
                        ...data,
                        pendingInvoices: [specificInvoice],
                        totalBalance: specificInvoice.totalAmount - specificInvoice.paidAmount,
                        payments: invoicePayments,
                    });
                } else {
                    setFilteredData(data);
                }
            } else {
                setFilteredData(data);
            }
            
            // Show appropriate feedback
            if (loadedFromCache) {
                if (!isConnected || !isInternetReachable) {
                    Toast.show({ type: 'info', text1: 'Offline Mode', text2: 'Showing cached data', position: 'bottom' });
                } else {
                    Toast.show({ type: 'info', text1: 'Using cached data', text2: 'Could not reach server', position: 'bottom' });
                }
            }
        } catch (e: any) {
            console.error('Error loading customer profile:', e);
            Alert.alert('Error', 'Failed to load customer profile');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatDate = (ds: string): string => {
        if (!ds) return '';
        const d = new Date(ds);
        if (isNaN(d.getTime())) return '';
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        return `${month} ${d.getDate()}, ${d.getFullYear()}`;
    };
    const formatBillDate = (ds: string): string => {
        if (!ds) return '';
        const d = new Date(ds);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    const fmt = (n: number) => `Rs.${n.toLocaleString('en-IN')}`;

    // ── Share helpers ─────────────────────────────────────────────────────────
    const getMsg = (): string => {
        if (!profileData) return '';
        const { customer, pendingInvoices, totalBalance, payments } = profileData;
        const fi = pendingInvoices[0];
        return `*${customer.name}*\nInvoice No: ${fi?.invoiceNumber ?? 'N/A'}\n\n${payments.map((p, i) => `Bill ${i + 1} - ${formatBillDate(p.paidAt)}  ${fmt(p.amount)}`).join('\n')}\n\n*TOTAL:* ${fmt(totalBalance)}\n\nFriendly reminder from ${shopName}: balance of ${fmt(totalBalance)} remaining. Thanks!`;
    };
    const openURL = async (url: string) => {
        const ok = await Linking.canOpenURL(url).catch(() => false);
        if (ok) { await Linking.openURL(url); setShareModalVisible(false); }
        else Alert.alert('Error', 'App not installed');
    };
    
    const handleShareWhatsApp = async () => {
        try {
            Toast.show({ type: 'info', text1: 'Preparing...', text2: 'Creating PDF for WhatsApp', position: 'bottom' });
            const html = generateProfileHtml();
            const { uri } = await Print.printToFileAsync({ html });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { 
                    UTI: '.pdf', 
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share via WhatsApp'
                });
                setShareModalVisible(false);
                Toast.show({ type: 'success', text1: 'Success', text2: 'PDF ready to share', position: 'bottom' });
            } else {
                Alert.alert('Error', 'Sharing not available on this device');
            }
        } catch (error) {
            console.error('WhatsApp share error:', error);
            Alert.alert('Share Error', 'Failed to create PDF for sharing.');
        }
    };
    
    const handleShareMessenger = () => openURL(`fb-messenger://share?text=${encodeURIComponent(getMsg())}`);
    const handleCopyUrl = async () => { try { await Share.share({ message: getMsg() }); setShareModalVisible(false); } catch { } };
    
    const handleShareMore = async () => {
        try {
            Toast.show({ type: 'info', text1: 'Preparing...', text2: 'Creating PDF', position: 'bottom' });
            const html = generateProfileHtml();
            const { uri } = await Print.printToFileAsync({ html });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { 
                    UTI: '.pdf', 
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Customer Profile'
                });
                setShareModalVisible(false);
                Toast.show({ type: 'success', text1: 'Success', text2: 'PDF ready to share', position: 'bottom' });
            } else {
                Alert.alert('Error', 'Sharing not available on this device');
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Share Error', 'Failed to create PDF for sharing.');
        }
    };

    // ── Print & Download helpers ──────────────────────────────────────────────
    const generateProfileHtml = (): string => {
        if (!displayData) return '';
        const { customer, pendingInvoices, totalBalance, payments } = displayData;
        const fi = pendingInvoices[0];
        
        const paymentsRows = payments.map((p, i) => `
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Bill ${68 + i} - ${formatBillDate(p.paidAt)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(p.amount)}</td>
            </tr>
        `).join('');
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #E46269; padding-bottom: 10px; }
                    .title { font-size: 24px; font-weight: bold; color: #E46269; }
                    .customer-info { margin: 20px 0; }
                    .info-row { margin: 8px 0; }
                    .label { font-weight: bold; color: #555; }
                    .invoice-card { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .amount-due { font-size: 32px; font-weight: bold; color: #E46269; text-align: right; }
                    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .table th { background: #E46269; color: white; padding: 10px; text-align: left; }
                    .table td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .notes { background: #fff4e6; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #F07C3A; }
                    .total-amount { font-size: 20px; font-weight: bold; color: #F07C3A; text-align: right; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">${specificInvoiceNumber ? `Invoice #${specificInvoiceNumber}` : 'Customer Profile'}</div>
                    <div style="font-size: 14px; color: #666;">${shopName}</div>
                </div>
                
                <div class="customer-info">
                    <div class="info-row"><span class="label">Customer:</span> ${customer.name}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${customer.phoneNumber}</div>
                    ${fi ? `<div class="info-row"><span class="label">Invoice No:</span> ${fi.invoiceNumber}</div>` : ''}
                </div>
                
                <div class="invoice-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: #888;">INVOICE FOR</div>
                            <div style="font-weight: bold; margin: 5px 0;">${customer.name}</div>
                            <div style="font-size: 14px; color: #666;">Ph.no: ${customer.phoneNumber}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #888; text-align: right;">AMOUNT DUE</div>
                            <div class="amount-due">${fmt(totalBalance)}</div>
                            ${fi?.dueDate && formatDate(fi.dueDate) ? `<div style="color: #E46269; text-align: right;">${formatDate(fi.dueDate)}</div>` : ''}
                        </div>
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>BILLS</th>
                            <th style="text-align: right;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length > 0 ? paymentsRows : '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No bills yet</td></tr>'}
                    </tbody>
                </table>
                
                ${totalBalance > 0 ? `
                    <div class="notes">
                        <div style="font-weight: bold; margin-bottom: 10px;">NOTES</div>
                        <div style="color: #555;">
                            Friendly reminder from ${shopName}: You have a balance of 
                            <strong>${fmt(totalBalance)}</strong> remaining. 
                            Tap to pay or stop by soon. Thanks!
                        </div>
                        <div class="total-amount">${fmt(totalBalance)}</div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
                    Generated on ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;
    };

    const handleSaveAndPrint = async (): Promise<void> => {
        try {
            Toast.show({ type: 'info', text1: 'Preparing...', text2: 'Generating PDF', position: 'bottom' });
            const html = generateProfileHtml();
            await Print.printAsync({ html });
            Toast.show({ type: 'success', text1: 'Success', text2: 'Print dialog opened', position: 'bottom' });
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert('Print Error', 'Failed to print customer profile.');
        }
    };

    const handleDownload = async (): Promise<void> => {
        try {
            Toast.show({ type: 'info', text1: 'Downloading...', text2: 'Creating PDF', position: 'bottom' });
            const html = generateProfileHtml();
            const { uri } = await Print.printToFileAsync({ html });
            
            // Request permission to save to media library
            const { status } = await MediaLibrary.requestPermissionsAsync();
            
            if (status === 'granted') {
                // Save to device
                const asset = await MediaLibrary.createAssetAsync(uri);
                await MediaLibrary.createAlbumAsync('Viveha', asset, false)
                    .catch(() => {
                        // Album might already exist, that's fine
                    });
                
                Toast.show({ 
                    type: 'success', 
                    text1: 'Downloaded!', 
                    text2: 'PDF saved to your device', 
                    position: 'bottom',
                    visibilityTime: 3000
                });
            } else {
                // Fallback to share if permission denied
                Alert.alert(
                    'Permission Required',
                    'Storage permission is needed to download the PDF. You can share it instead.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Share Instead',
                            onPress: async () => {
                                if (await Sharing.isAvailableAsync()) {
                                    await Sharing.shareAsync(uri, { 
                                        UTI: '.pdf', 
                                        mimeType: 'application/pdf',
                                        dialogTitle: 'Save Customer Profile'
                                    });
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Download Error', 'Failed to download customer profile.');
        }
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.centred}>
                    <ActivityIndicator size="large" color={ROSE} />
                    <Text style={s.loadingTxt}>Loading customer profile…</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (!profileData) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.centred}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
                    <Text style={s.errorTxt}>Failed to load customer profile</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={loadCustomerProfile}>
                        <Text style={s.retryBtnTxt}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Use filtered data if available, otherwise use full profile data
    const displayData = filteredData || profileData;
    const { customer, pendingInvoices, totalBalance } = displayData;
    const fi = pendingInvoices[0] ?? null;

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={s.container}>

            {/* ══ WHITE TOP HEADER BAR ══ */}
            <View style={[s.header, { paddingTop: Math.max(insets.top, 14) }]}>
                <Image
                    source={require('../assets/logo.jpeg')}
                    style={s.logo}
                    resizeMode="contain"
                />
                <Text style={s.headerTitle}>
                    {specificInvoiceNumber ? `Invoice #${specificInvoiceNumber}` : 'Customer Profile'}
                </Text>
                <View style={{ width: 32 }} />
            </View>

            {/* ══ SCROLL CONTENT ══ */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 10) + 90 }}
                showsVerticalScrollIndicator={false}
            >
                {/*
                  ╔══════════════════════════════════════╗
                  ║   MAIN CARD                          ║
                  ║   • coral rounded-top section        ║
                  ║   • white invoice sub-card (bridge)  ║
                  ║   • white rounded-bottom section     ║
                  ╚══════════════════════════════════════╝
                */}
                <View style={s.mainCard}>

                    {/* ─── CORAL TOP SECTION ─────────────────────────────── */}
                    <View style={s.coralSection}>

                        {/* Icon row: × left   ✎ ⋮ right */}
                        <View style={s.iconRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
                                <Ionicons name="close" size={15} color="#fff" />
                            </TouchableOpacity>
                            {/* Edit and three-dot icons - not needed for now */}
                            {/* <View style={s.iconRowRight}>
                                <TouchableOpacity style={s.iconBtn}>
                                    <Ionicons name="create-outline" size={15} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity style={s.iconBtn}>
                                    <Ionicons name="ellipsis-vertical" size={15} color="#fff" />
                                </TouchableOpacity>
                            </View> */}
                        </View>

                        {/* Customer name & invoice no. */}
                        <Text style={s.customerName}>{customer.name}</Text>
                        <Text style={s.invoiceNo}>
                            Invoice No.: {fi?.invoiceNumber ?? 'N/A'}
                        </Text>

                        {/*
                          ── WHITE INVOICE SUB-CARD ──
                          sits at the bottom of the coral section and
                          extends DOWN via negative marginBottom so it
                          visually bridges into the white section below
                        */}
                        <View style={s.invoiceSubCard}>
                            {/* Left: Invoice For */}
                            <View style={s.subLeft}>
                                <Text style={s.subCaption}>INVOICE FOR</Text>
                                <Text style={s.subName}>{customer.name}</Text>
                                {customer.address
                                    ? <Text style={s.subBody}>{customer.address}</Text>
                                    : null}
                                <Text style={s.subBody}>Ph.no: {customer.phoneNumber}</Text>
                            </View>

                            {/* Vertical divider */}
                            <View style={s.subDivider} />

                            {/* Right: Amount Due */}
                            <View style={s.subRight}>
                                <Text style={s.subCaption}>AMOUNT DUE</Text>
                                <Text style={s.subAmount}>{fmt(totalBalance)}</Text>
                                {fi?.dueDate && formatDate(fi.dueDate)
                                    ? <Text style={s.subDue}>{formatDate(fi.dueDate)}</Text>
                                    : null}
                            </View>
                        </View>
                    </View>
                    {/* ─── end coralSection ─────────────────────────────── */}

                    {/* ─── WHITE BOTTOM SECTION ─────────────────────────── */}
                    {/*
                      paddingTop gives room so content starts below
                      the overlapping invoiceSubCard
                    */}
                    <View style={s.whiteSection}>

                        {/* Bills box */}
                        <View style={s.infoBox}>
                            <View style={s.infoBoxHeader}>
                                <Text style={s.infoBoxCaption}>BILLS</Text>
                                <Text style={s.infoBoxCaption}>TOTAL</Text>
                            </View>
                            {displayData.payments && displayData.payments.length > 0 ? (
                                displayData.payments.map((pmt, idx) => (
                                    <View
                                        key={pmt._id}
                                        style={[
                                            s.billRow,
                                            idx === displayData.payments.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                                        ]}
                                    >
                                        <Text style={s.billTxt}>
                                            Bill {68 + idx}{'  -  '}{formatBillDate(pmt.paidAt)}
                                        </Text>
                                        <Text style={s.billAmt}>{fmt(pmt.amount)}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={s.emptyTxt}>No bills yet</Text>
                            )}
                        </View>

                        {/* Notes box */}
                        {totalBalance > 0 && (
                            <View style={s.infoBox}>
                                <View style={s.infoBoxHeader}>
                                    <Text style={s.infoBoxCaption}>NOTES</Text>
                                    <Text style={s.infoBoxCaption}>TOTAL AMOUNT</Text>
                                </View>
                                <View style={s.notesRow}>
                                    <Text style={s.notesTxt}>
                                        Friendly reminder from {shopName}: You have a balance of{' '}
                                        <Text style={s.notesBold}>{fmt(totalBalance)}</Text>
                                        {' '}remaining. Tap to pay or stop by soon. Thanks!
                                    </Text>
                                    <Text style={s.totalAmt}>{fmt(totalBalance)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View style={s.actionRow}>
                            {/* Orange Save & Print */}
                            <TouchableOpacity
                                style={s.savePrintBtn}
                                onPress={handleSaveAndPrint}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="save-outline" size={17} color="#fff" />
                                <Text style={s.savePrintTxt}>Save &amp; Print</Text>
                            </TouchableOpacity>

                            {/* Download icon */}
                            <TouchableOpacity
                                style={s.sqBtn}
                                onPress={handleDownload}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="download-outline" size={20} color="#555" />
                            </TouchableOpacity>

                            {/* Share icon */}
                            <TouchableOpacity
                                style={s.sqBtn}
                                onPress={() => setShareModalVisible(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="share-social-outline" size={20} color="#555" />
                            </TouchableOpacity>
                        </View>

                    </View>
                    {/* ─── end whiteSection ──────────────────────────────── */}

                </View>
                {/* ─── end mainCard ──────────────────────────────────────── */}

            </ScrollView>

            {/* ══ SHARE MODAL ══ */}
            <Modal
                visible={shareModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={s.modalOverlay}>

                    {/* ── Header: × left  Share center ── */}
                    <View style={[s.modalHeader, { paddingTop: 54 }]}>
                        <TouchableOpacity onPress={() => setShareModalVisible(false)} style={s.modalCloseBtn}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={s.modalTitle}>Share</Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* ── Full card preview ── */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Mini card: coral top */}
                        <View style={s.shareCardWrap}>

                            {/* Coral header */}
                            <View style={s.shareCoralTop}>
                                <Text style={s.shareWM}>viveha.ai</Text>
                                <Text style={s.shareCustomerName}>{customer.name}</Text>
                                <Text style={s.shareInvoiceNo}>Invoice No.: {fi?.invoiceNumber ?? 'N/A'}</Text>

                                {/* Invoice sub-card inside coral */}
                                <View style={s.shareInvoiceSubCard}>
                                    <View style={s.subLeft}>
                                        <Text style={s.subCaption}>INVOICE FOR</Text>
                                        <Text style={s.subName}>{customer.name}</Text>
                                        {customer.address
                                            ? <Text style={s.subBody}>{customer.address}</Text>
                                            : null}
                                        <Text style={s.subBody}>Ph.no: {customer.phoneNumber}</Text>
                                    </View>
                                    <View style={s.subDivider} />
                                    <View style={s.subRight}>
                                        <Text style={s.subCaption}>AMOUNT DUE</Text>
                                        <Text style={s.subAmount}>{fmt(totalBalance)}</Text>
                                        {fi?.dueDate && formatDate(fi.dueDate)
                                            ? <Text style={s.subDue}>{formatDate(fi.dueDate)}</Text>
                                            : null}
                                    </View>
                                </View>
                            </View>

                            {/* White bottom: Bills */}
                            <View style={s.shareWhiteSection}>
                                <View style={s.infoBoxHeader}>
                                    <Text style={s.infoBoxCaption}>BILLS</Text>
                                    <Text style={s.infoBoxCaption}>TOTAL</Text>
                                </View>
                                {displayData.payments && displayData.payments.length > 0 ? (
                                    displayData.payments.map((pmt, idx) => (
                                        <View
                                            key={pmt._id}
                                            style={[
                                                s.billRow,
                                                idx === displayData.payments.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                                            ]}
                                        >
                                            <Text style={s.billTxt}>Bill {68 + idx}{'  -  '}{formatBillDate(pmt.paidAt)}</Text>
                                            <Text style={s.billAmt}>{fmt(pmt.amount)}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={s.emptyTxt}>No bills yet</Text>
                                )}

                                {/* Notes */}
                                {totalBalance > 0 && (
                                    <View style={[s.infoBox, { marginTop: 4 }]}>
                                        <View style={s.infoBoxHeader}>
                                            <Text style={s.infoBoxCaption}>NOTES</Text>
                                            <Text style={s.infoBoxCaption}>TOTAL AMOUNT</Text>
                                        </View>
                                        <View style={s.notesRow}>
                                            <Text style={s.notesTxt}>
                                                Friendly reminder from {shopName}: You have a balance of{' '}
                                                <Text style={s.notesBold}>{fmt(totalBalance)}</Text>
                                                {' '}remaining. Tap to pay or stop by soon. Thanks!
                                            </Text>
                                            <Text style={s.totalAmt}>{fmt(totalBalance)}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>

                    {/* ── Bottom share icons ── */}
                    <View style={s.shareBar}>
                        <TouchableOpacity style={s.shareOpt} onPress={handleCopyUrl}>
                            <View style={[s.shareCircle, { backgroundColor: '#3A3A3C' }]}>
                                <Ionicons name="link" size={22} color="#fff" />
                            </View>
                            <Text style={s.shareLbl}>Copy url</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.shareOpt} onPress={handleShareMessenger}>
                            <View style={[s.shareCircle, { backgroundColor: '#A033FF' }]}>
                                <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                            </View>
                            <Text style={s.shareLbl}>Messenger</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.shareOpt} onPress={handleShareWhatsApp}>
                            <View style={[s.shareCircle, { backgroundColor: '#25D366' }]}>
                                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                            </View>
                            <Text style={s.shareLbl}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.shareOpt} onPress={handleShareMore}>
                            <View style={[s.shareCircle, { backgroundColor: '#3A3A3C' }]}>
                                <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
                            </View>
                            <Text style={s.shareLbl}>More</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </Modal>

            {/* ══ FOOTER ══ */}
            <Footer navigation={navigation} activeTab="Pendings" />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

    // Page
    container: { flex: 1, backgroundColor: '#EFEFEF' },
    scroll: { flex: 1 },

    // ── White app header ──────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 18,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
        zIndex: 10,
    },
    logo: { width: 32, height: 32 },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    // ── MAIN CARD (wraps coral + white) ──────────────────────────────────────
    mainCard: {
        borderRadius: 18,
        overflow: 'hidden',          // clips children to rounded corners
        backgroundColor: '#fff',     // white shows through the bottom section
        // Card shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 6,
    },

    // ── Coral top section ─────────────────────────────────────────────────────
    coralSection: {
        backgroundColor: ROSE,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 0,            // invoiceSubCard's negative margin handles spacing
    },
    iconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    iconRowRight: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 28, height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customerName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.2,
        marginBottom: 4,
    },
    invoiceNo: {
        fontSize: 12.5,
        color: 'rgba(255,255,255,0.88)',
        fontWeight: '400',
        marginBottom: 16,
    },

    // ── White invoice sub-card (bridges coral → white) ────────────────────────
    invoiceSubCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        marginHorizontal: 14,
        marginBottom: -32,          // extends 32px DOWN into the white section
        borderRadius: 12,           // all 4 corners rounded (proper floating card)
        padding: 14,
        zIndex: 2,                  // renders on top of whiteSection
        elevation: 6,               // Android layering
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
    },
    subLeft: { flex: 1, paddingRight: 8 },
    subDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#EBEBEB', marginHorizontal: 10 },
    subRight: { alignItems: 'flex-end', minWidth: 108 },
    subCaption: {
        fontSize: 8.5, fontWeight: '700', color: '#AAAAAA',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
    },
    subName: { fontSize: 13.5, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
    subBody: { fontSize: 11.5, color: '#666', lineHeight: 17, marginBottom: 1 },
    subAmount: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 4 },
    subDue: { fontSize: 10.5, color: '#E03535', fontWeight: '700', letterSpacing: 0.3 },

    // ── White bottom section ──────────────────────────────────────────────────
    whiteSection: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 38,             // leaves room for the overlapping invoiceSubCard above
        paddingBottom: 16,
    },

    // ── Info boxes (Bills, Notes) ─────────────────────────────────────────────
    infoBox: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
        paddingBottom: 12,
    },
    infoBoxHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoBoxCaption: {
        fontSize: 8.5, fontWeight: '700', color: '#AAAAAA',
        letterSpacing: 1, textTransform: 'uppercase',
    },

    // Bills
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    billTxt: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
    billAmt: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
    emptyTxt: { fontSize: 12.5, color: '#AAAAAA', fontStyle: 'italic', paddingVertical: 6 },

    // Notes
    notesRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    notesTxt: { flex: 1, fontSize: 11, color: '#666', lineHeight: 17, marginRight: 10 },
    notesBold: { fontWeight: '800', color: '#1A1A1A' },
    totalAmt: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.4 },

    // ── Action buttons ────────────────────────────────────────────────────────
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    savePrintBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ORANGE,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    savePrintTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    sqBtn: {
        width: 50, height: 50,
        backgroundColor: '#F0EEEE',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Loading / Error ───────────────────────────────────────────────────────
    centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingTxt: { marginTop: 10, fontSize: 15, color: '#888' },
    errorTxt: { fontSize: 15, color: '#888', marginTop: 14, marginBottom: 20 },
    retryBtn: { backgroundColor: ROSE, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    retryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // ── Share modal ───────────────────────────────────────────────────────────
    // Full-screen dark charcoal background (matches image)
    modalOverlay: {
        flex: 1,
        backgroundColor: '#1C1C1E',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 16,
    },
    modalCloseBtn: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: '#3A3A3C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },

    // Card preview wrapper (rounded + shadow)
    shareCardWrap: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    // Coral top inside the share preview card
    shareCoralTop: {
        backgroundColor: ROSE,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 0,
        position: 'relative',
    },
    shareWM: {
        position: 'absolute',
        top: 12, right: 14,
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: 1.2,
    },
    shareCustomerName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.2,
        marginBottom: 3,
    },
    shareInvoiceNo: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 14,
    },
    // White invoice sub-card inside modal coral section
    shareInvoiceSubCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        padding: 14,
    },
    // White bills+notes section inside modal card
    shareWhiteSection: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 14,
    },

    // Bottom share icon bar
    shareBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 28,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    shareOpt: { alignItems: 'center', gap: 8 },
    shareCard: { backgroundColor: ROSE, borderRadius: 14, padding: 16, position: 'relative' },
    shareOptions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 24 },
    shareCircle: {
        width: 56, height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareLbl: { fontSize: 11.5, color: '#AEAEB2', fontWeight: '500' },
});