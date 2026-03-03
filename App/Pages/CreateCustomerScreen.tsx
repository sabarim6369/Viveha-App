import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SyncIndicator from '../Components/SyncIndicator';
import { 
  saveClient,
  useNetworkStatus,
  getPendingSyncItems
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';

interface CreateCustomerScreenProps {
    navigation: any;
}

interface CustomerFieldSettings {
    address: boolean;
    emailId: boolean;
    gstNo: boolean;
}

export default function CreateCustomerScreen({ navigation }: CreateCustomerScreenProps): React.JSX.Element {
    const insets = useSafeAreaInsets();
    
    // Network status monitoring
    const { isConnected, isInternetReachable } = useNetworkStatus();
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [name, setName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [gstNo, setGstNo] = useState<string>('');
    const [isGstRegistered, setIsGstRegistered] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [customerFieldSettings, setCustomerFieldSettings] = useState<CustomerFieldSettings>({
        address: false,
        emailId: false,
        gstNo: false,
    });

    useEffect(() => {
        loadCustomerFieldSettings();
        updatePendingSyncCount();
    }, []);

    // Update pending sync count
    const updatePendingSyncCount = async () => {
        try {
            const pendingItems = await getPendingSyncItems();
            setPendingSyncCount(pendingItems.length);
        } catch (error) {
            console.error('Error getting pending sync count:', error);
        }
    };

    // Monitor network status
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

    const loadCustomerFieldSettings = async (): Promise<void> => {
        try {
            const cachedSettings = await AsyncStorage.getItem('@viveha_customer_field_settings');
            if (cachedSettings) {
                setCustomerFieldSettings(JSON.parse(cachedSettings));
            }
        } catch (error) {
            console.error('Error loading customer field settings:', error);
        }
    };

    const validateInputs = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter customer name');
            return false;
        }

        if (!phone.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return false;
        }

        if (phone.length !== 10) {
            Alert.alert('Error', 'Phone number must be exactly 10 digits');
            return false;
        }

        if (customerFieldSettings.emailId && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Alert.alert('Error', 'Please enter a valid email address');
                return false;
            }
        }

        return true;
    };

    const handleSaveCustomer = async (): Promise<void> => {
        if (!validateInputs()) return;

        try {
            setIsSaving(true);
            const isOffline = !isConnected || !isInternetReachable;

            const customerData: any = {
                name: name.trim(),
                phone: phone.trim(),
            };

            // Add optional fields only if they are enabled in settings and have values
            if (customerFieldSettings.address && address.trim()) {
                customerData.address = address.trim();
            }

            if (customerFieldSettings.emailId && email.trim()) {
                customerData.emailId = email.trim();
            }

            if (customerFieldSettings.gstNo && isGstRegistered && gstNo.trim()) {
                customerData.gstNo = gstNo.trim();
            }

            const result = await saveClient(customerData, false);

            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: isOffline ? 'Saved Offline' : 'Success',
                    text2: isOffline ? 'Customer will sync when online' : 'Customer created successfully',
                    position: 'bottom',
                });
                navigation.goBack();
            } else {
                Alert.alert('Error', 'Failed to create customer');
            }
        } catch (error: any) {
            console.error('Error creating customer:', error);
            Alert.alert('Error', error.message || 'Failed to create customer');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Sync Indicator */}
            <SyncIndicator 
                isSyncing={isSyncing}
                isOnline={isConnected && isInternetReachable}
                pendingCount={pendingSyncCount}
            />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Customer</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formContainer}>
                        {/* Full Name - Always shown */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="eg.Mohan Kumar"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor="#999"
                            />
                        </View>

                        {/* Phone Number - Always shown */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="9876543210"
                                value={phone}
                                onChangeText={(text) => {
                                    // Only allow numeric input
                                    const numericText = text.replace(/[^0-9]/g, '');
                                    setPhone(numericText);
                                }}
                                keyboardType="numeric"
                                maxLength={10}
                                placeholderTextColor="#999"
                            />
                        </View>

                        {/* Email Address - Conditional */}
                        {customerFieldSettings.emailId && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="customer@gmail.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        )}

                        {/* Full Address - Conditional */}
                        {customerFieldSettings.address && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Address</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="House No, Street, City, Pincode"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                    numberOfLines={3}
                                    placeholderTextColor="#999"
                                />
                            </View>
                        )}

                        {/* GST Registered Toggle - Conditional */}
                        {customerFieldSettings.gstNo && (
                            <>
                                <View style={styles.gstToggleContainer}>
                                    <View style={styles.gstToggleLeft}>
                                        <Ionicons name="document-text-outline" size={20} color="#E88E99" />
                                        <View style={styles.gstToggleText}>
                                            <Text style={styles.gstToggleTitle}>GST Registered?</Text>
                                            <Text style={styles.gstToggleSubtitle}>Enable for tax invoicing</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={isGstRegistered}
                                        onValueChange={setIsGstRegistered}
                                        trackColor={{ false: '#E0E0E0', true: '#FFB3BA' }}
                                        thumbColor={isGstRegistered ? '#E88E99' : '#f4f3f4'}
                                    />
                                </View>

                                {/* GST Number - Conditional on toggle */}
                                {isGstRegistered && (
                                    <View style={[styles.inputGroup, styles.gstInputGroup]}>
                                        <Text style={styles.label}>GST Number</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter GST Number"
                                            value={gstNo}
                                            onChangeText={setGstNo}
                                            autoCapitalize="characters"
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>

                {/* Save Button */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSaveCustomer}
                        disabled={isSaving}
                    >
                        <Ionicons name="save-outline" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving...' : 'Save Customer'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Footer navigation={navigation} activeTab="Home" />
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 24,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    gstToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    gstToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    gstToggleText: {
        marginLeft: 12,
        flex: 1,
    },
    gstToggleTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    gstToggleSubtitle: {
        fontSize: 12,
        color: '#999',
    },
    gstInputGroup: {
        marginTop: -5,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E88E99',
        paddingVertical: 15,
        borderRadius: 10,
        gap: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
