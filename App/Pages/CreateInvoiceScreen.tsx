import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Footer from '../Components/Footer';
import SyncIndicator from '../Components/SyncIndicator';
import {
  useNetworkStatus,
  saveLocalData,
  getLocalData,
  addToPendingSync,
  getPendingSyncItems,
  syncWithServer,
  STORAGE_KEYS,
  saveInvoice,
  saveClient,
  getClients,
  getItems,
  getPendingSyncByType,
  createInvoiceViaBackend,
} from '../utils/NetworkManager';

interface CreateInvoiceScreenProps {
  navigation: any;
}

interface InvoiceItem {
  id?: string;
  serverId?: string;
  name: string;
  quantity: number;
  unit: string;
  actualPrice?: number; // Original/MRP price (for reference)
  salePrice: number;    // Price applied in invoice
  price: number;        // Backward compatibility
  tax: number;
  discount: number;
  stockAvailable?: number;
}

interface ClientInfo {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gstNo?: string;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface InvoiceDetails {
  number: string;
  invoiceDate: string;
  dueDate: string;
}

interface AvailableItem {
  id: string;
  serverId?: string;
  name: string;
  actualPrice?: number; // Original/MRP price
  salePrice?: number;   // Selling price (used in invoices)
  amount?: number;      // Backward compatibility (actualPrice)
  price?: number;       // Backward compatibility (salePrice)
  stock: number;
}

interface SavedClient {
  id: string;
  serverId?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gstNo?: string;
  createdAt?: string;
}

interface PhoneContact {
  id: string;
  name: string;
  phone: string;
}

interface CustomerFieldSettings {
  address: boolean;
  emailId: boolean;
  gstNo: boolean;
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
}

interface InvoiceData {
  number: string;
  items: InvoiceItem[];
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  invoiceDate: string;
  dueDate: string;
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  grandTotal: number;
  paidAmount: number;
  notes: string;
  additionalFees?: AdditionalFee[];
}

interface PendingRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  date: string;
  time: string;
  status: string;
  createdAt: string;
  // Full invoice data for proper viewing
  subtotal?: number;
  subTotal?: number;
  tax?: number;
  totalTax?: number;
  discount?: number;
  totalDiscount?: number;
  totalAmount?: number;
  paidAmount?: number;
  additionalFees?: AdditionalFee[];
  customCharges?: any[];
  items?: InvoiceItem[];
  invoiceDate?: string;
  dueDate?: string;
}

// Helper function to generate invoice numbers
// Offline invoices use 'OFF-' prefix to prevent duplicate numbers during sync conflicts
// When online and invoice syncs successfully, backend may assign the final invoice number
const generateInvoiceNumber = async (isOffline: boolean): Promise<string> => {
  try {
    const shopDetailsStr = await AsyncStorage.getItem('@viveha_shop_details');
    let nextInvoiceNo = 1;

    if (shopDetailsStr) {
      const details = JSON.parse(shopDetailsStr);
      nextInvoiceNo = (details.invoiceCount || 0) + 1;
    }

    // Check local storage for any existing invoices with higher numbers
    const localInvoices = await getLocalData(STORAGE_KEYS.INVOICES) || [];
    const pendingsStr = await AsyncStorage.getItem('@viveha_pendings');
    const pendingList = pendingsStr ? JSON.parse(pendingsStr) : [];

    const allExisting = [...localInvoices, ...pendingList];
    allExisting.forEach(inv => {
      const numStr = inv.number || inv.invoiceNumber;
      if (numStr) {
        const numericPart = parseInt(numStr.replace(/[^0-9]/g, ''));
        if (!isNaN(numericPart) && numericPart >= nextInvoiceNo) {
          nextInvoiceNo = numericPart + 1;
        }
      }
    });

    const formattedNumber = String(nextInvoiceNo).padStart(6, '0');
    return isOffline ? `OFF-${formattedNumber}` : `#${formattedNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return isOffline ? 'OFF-000001' : '#000001';
  }
};

export default function CreateInvoiceScreen({ navigation }: CreateInvoiceScreenProps): React.JSX.Element {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [selectItemModalVisible, setSelectItemModalVisible] = useState<boolean>(false);
  const [selectClientModalVisible, setSelectClientModalVisible] = useState<boolean>(false);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientGstNo, setClientGstNo] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [hasContactsPermission, setHasContactsPermission] = useState<boolean>(false);
  const [contactsModalVisible, setContactsModalVisible] = useState<boolean>(false);
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [showDueDatePicker, setShowDueDatePicker] = useState<boolean>(false);
  const [selectedDueDate, setSelectedDueDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default 30 days from now
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [customerFieldSettings, setCustomerFieldSettings] = useState<CustomerFieldSettings>({
    address: false,
    emailId: false,
    gstNo: false,
  });
  const [taxSettings, setTaxSettings] = useState<{
    enableTaxCalculation: boolean;
    primaryTaxRate: number;
  }>({
    enableTaxCalculation: false,
    primaryTaxRate: 0,
  });
  const [enableInvoiceTax, setEnableInvoiceTax] = useState<boolean>(false);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([]);
  const [addFeeModalVisible, setAddFeeModalVisible] = useState<boolean>(false);
  const [feeName, setFeeName] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('');

  // Format date as DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    number: '#000002',
    invoiceDate: formatDate(new Date()), // Current date
    dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
  });

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: 'My Shop',
    address: '',
    phone: '',
    email: '',
  });

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    phone: '',
    address: '',
    email: '',
    gstNo: '',
  });

  const returningFromPreviewRef = useRef(false);

  // Reset form when screen comes into focus (but not when returning from Preview)
  useFocusEffect(
    React.useCallback(() => {
      if (returningFromPreviewRef.current) {
        returningFromPreviewRef.current = false;
        return;
      }
      // Reset all form state
      setItems([]);
      setAdditionalFees([]);
      setClientInfo({
        name: '',
        phone: '',
        address: '',
        email: '',
        gstNo: '',
      });
      setClientName('');
      setClientAddress('');
      setClientEmail('');
      setClientGstNo('');
      setPhoneSearch('');
      setShowNameInput(false);
      setItemSearchQuery('');
      setClientSearchQuery('');
      setContactSearchQuery('');

      // Reset modal states
      setSelectItemModalVisible(false);
      setSelectClientModalVisible(false);
      setContactsModalVisible(false);
      setShowDueDatePicker(false);

      // Reset dates
      const now = new Date();
      const dueDateDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setSelectedDueDate(dueDateDefault);
      setInvoiceDetails({
        number: '#000002',
        invoiceDate: formatDate(now),
        dueDate: formatDate(dueDateDefault),
      });

      // Reload fresh data
      loadLocalData();
      loadAvailableItems();
      loadClients();
      loadCustomerFieldSettings();
      loadTaxSettings();

      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Load data from local storage on mount
  useEffect(() => {
    loadLocalData();
    loadAvailableItems();
    loadClients();
    loadCustomerFieldSettings();
    loadTaxSettings();
    loadCustomerFieldSettings();
  }, []);

  const loadAvailableItems = async (): Promise<void> => {
    try {
      const loadedItems = await getItems();
      setAvailableItems(loadedItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

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

  const loadTaxSettings = async (): Promise<void> => {
    try {
      const cachedTaxSettings = await AsyncStorage.getItem('@viveha_tax_settings');
      if (cachedTaxSettings) {
        const settings = JSON.parse(cachedTaxSettings);
        console.log('📊 Loaded tax settings:', settings);
        setTaxSettings(settings);

        const draftTaxStatus = await AsyncStorage.getItem('@viveha_invoice_draft_tax');
        if (draftTaxStatus !== null) {
          setEnableInvoiceTax(JSON.parse(draftTaxStatus));
        } else {
          setEnableInvoiceTax(settings.enableTaxCalculation);
        }
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
    }
  };

  const loadClients = async (): Promise<void> => {
    try {
      const loadedClients = await getClients();
      setSavedClients(loadedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Monitor network status and sync when online
  useEffect(() => {
    if (isConnected && isInternetReachable) {
      checkAndSync();
    }
  }, [isConnected, isInternetReachable]);

  // Update pending count
  useEffect(() => {
    updatePendingCount();
  }, [items, invoiceDetails]);

  const loadLocalData = async (): Promise<void> => {
    try {
      const savedInvoices = await getLocalData(STORAGE_KEYS.INVOICES);
      // Removed: loading draft from main invoices array (was causing issues)

      // Load specific draft if exists
      const savedDraft = await getLocalData(STORAGE_KEYS.DRAFTS);
      if (savedDraft && Array.isArray(savedDraft) && savedDraft.length > 0) {
        const draft = savedDraft[0];
        if (draft.items) setItems(draft.items);
        if (draft.details) setInvoiceDetails(draft.details);
        if (draft.businessInfo) setBusinessInfo(draft.businessInfo);
        if (draft.clientInfo) {
          setClientInfo(draft.clientInfo);
          setClientName(draft.clientInfo.name);
          setClientAddress(draft.clientInfo.address || '');
          setClientEmail(draft.clientInfo.email || '');
          setClientGstNo(draft.clientInfo.gstNo || '');
        }
        console.log('📝 Loaded saved draft with', draft.items?.length || 0, 'items');
      }

      // Load shop details
      const shopDetails = await AsyncStorage.getItem('@viveha_shop_details');
      if (shopDetails) {
        const details = JSON.parse(shopDetails);
        setBusinessInfo({
          name: details.shopName || 'My Shop',
          address: `${details.location}${details.city ? ', ' + details.city : ''}${details.state ? ', ' + details.state : ''}`,
          phone: '',
          email: '',
        });

        // Generate invoice number with offline prefix if not connected
        const invoiceNumber = await generateInvoiceNumber(!isConnected || !isInternetReachable);
        setInvoiceDetails(prev => ({
          ...prev,
          number: invoiceNumber
        }));
      }

      const savedBusiness = await getLocalData(STORAGE_KEYS.BUSINESS_INFO);
      if (savedBusiness) setBusinessInfo(savedBusiness);

      const savedClients = await getLocalData(STORAGE_KEYS.CLIENTS);
      if (savedClients && savedClients.length > 0) {
        setClientInfo(savedClients[0]);
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  const updatePendingCount = async (): Promise<void> => {
    const pending = await getPendingSyncByType();
    setPendingCount(pending.total);
  };

  const checkAndSync = async (): Promise<void> => {
    const pending = await getPendingSyncByType();
    if (pending.total > 0) {
      await performSync();
    }
  };

  const performSync = async (): Promise<void> => {
    setIsSyncing(true);
    const result = await syncWithServer();
    setIsSyncing(false);

    if (result.success) {
      setPendingCount(0);
      if (result.synced > 0) {
        Toast.show({
          type: 'success',
          text1: 'Sync Complete',
          text2: `${result.synced} items synced successfully!`,
          position: 'bottom',
        });
      }
    } else {
      /*
      Toast.show({
        type: 'error',
        text1: 'Sync Failed',
        text2: 'Could not sync data. Will retry when online.',
        position: 'bottom',
      });
      */
    }
  };

  const saveInvoiceLocally = async (invoiceData: InvoiceData): Promise<boolean> => {
    try {
      const invoice = {
        ...invoiceData,
        id: Date.now().toString(),
        // Keep the generated invoice number from invoiceData
        number: invoiceData.number,
        invoiceNumber: invoiceData.number, // Add both fields for compatibility
        invoiceDate: invoiceDetails.invoiceDate,
        dueDate: invoiceDetails.dueDate,
        businessInfo,
        clientInfo,
        items,
        subtotal: calculateSubTotal(),
        subTotal: calculateSubTotal(), // Add both for compatibility
        totalTax: calculateTotalTax(),
        tax: calculateTotalTax(), // Add both for compatibility
        totalDiscount: calculateTotalDiscount(),
        discount: calculateTotalDiscount(), // Add both for compatibility
        grandTotal: calculateGrandTotal(),
        total: calculateGrandTotal(), // Add both for compatibility
        remainingAmount: calculateGrandTotal(), // For pending invoices
        additionalFees: additionalFees,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Save with immediate sync attempt
      const result = await saveInvoice(invoice, false);

      if (result.success) {
        await updatePendingCount();

        // Show sync status to user
        if (result.synced) {
          console.log('Invoice synced to backend successfully');
        } else {
          console.log('Invoice saved locally, will sync when online');
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving invoice:', error);
      return false;
    }
  };

  const calculateItemTotal = (item: InvoiceItem): number => {
    const subtotal = item.price;
    const taxAmount = (subtotal * item.tax) / 100;
    const discountAmount = (subtotal * item.discount) / 100;
    return subtotal + taxAmount - discountAmount;
  };

  const calculateSubTotal = (): number => {
    return items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  };

  const calculateTotalTax = (): number => {
    if (!enableInvoiceTax) return 0;
    return items.reduce((sum, item) => sum + (((item.price || 0) * (item.quantity || 0) * (item.tax || 0)) / 100), 0);
  };

  const calculateTotalDiscount = (): number => {
    return 0; // Discount feature disabled
  };

  const calculateTotalAdditionalFees = (): number => {
    return additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
  };

  const calculateGrandTotal = (): number => {
    return calculateSubTotal() + calculateTotalTax() - calculateTotalDiscount() + calculateTotalAdditionalFees();
  };

  const handleAddItem = (): void => {
    setItemSearchQuery('');
    setSelectItemModalVisible(true);
  };

  const handleSelectItem = (selectedItem: AvailableItem): void => {
    // Check if item already exists in the list
    const existingItemIndex = items.findIndex(item =>
      item.serverId === (selectedItem.serverId || selectedItem.id)
    );

    if (existingItemIndex !== -1) {
      // Item exists, increase quantity
      const updatedItems = items.map((item, index) => {
        if (index === existingItemIndex) {
          const newQuantity = item.quantity + 1;
          if (item.stockAvailable && newQuantity > item.stockAvailable) {
            Toast.show({
              type: 'error',
              text1: 'Stock Limit',
              text2: `Only ${item.stockAvailable} items available in stock`,
              position: 'bottom',
            });
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      setItems(updatedItems);

      // Save locally to DRAFTS
      saveLocalData(STORAGE_KEYS.DRAFTS, [{
        items: updatedItems,
        details: invoiceDetails,
        businessInfo,
        updatedAt: new Date().toISOString(),
      }]);

      setSelectItemModalVisible(false);
    } else {
      // Item doesn't exist, add new
      const defaultTaxRate = taxSettings.enableTaxCalculation ? taxSettings.primaryTaxRate : 0;

      // Use salePrice if available, fallback to price/amount for backward compatibility
      const itemSalePrice = selectedItem.salePrice !== undefined ? selectedItem.salePrice : (selectedItem.price || selectedItem.amount || 0);
      const itemActualPrice = selectedItem.actualPrice !== undefined ? selectedItem.actualPrice : (selectedItem.amount || selectedItem.price || 0);

      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        serverId: selectedItem.serverId || selectedItem.id, // Backend item ID for stock deduction
        name: selectedItem.name,
        quantity: 1,
        unit: 'Nos',
        actualPrice: itemActualPrice,
        salePrice: itemSalePrice,
        price: itemSalePrice, // Use sale price for calculations
        tax: defaultTaxRate,
        discount: 0,
        stockAvailable: selectedItem.stock,
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);

      console.log('✅ Item added with tax:', defaultTaxRate + '%');

      // Save locally to DRAFTS
      saveLocalData(STORAGE_KEYS.DRAFTS, [{
        items: updatedItems,
        details: invoiceDetails,
        businessInfo,
        updatedAt: new Date().toISOString(),
      }]);

      setSelectItemModalVisible(false);
    }
  };

  const handleIncreaseQuantity = (itemId: number | string): void => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + 1;
        if (item.stockAvailable && newQuantity > item.stockAvailable) {
          Toast.show({
            type: 'error',
            text1: 'Stock Limit',
            text2: `Only ${item.stockAvailable} items available in stock`,
            position: 'bottom',
          });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleDecreaseQuantity = (itemId: number | string): void => {
    const updatedItems = items.map(item => {
      if (item.id === itemId && item.quantity > 1) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleOpenClientModal = (): void => {
    setPhoneSearch('');
    setClientName('');
    setShowNameInput(false);
    setClientSearchQuery('');
    setSelectClientModalVisible(true);
  };

  const handlePickContact = async (): Promise<void> => {
    try {
      // Request permission if not granted
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow access to contacts',
          position: 'bottom',
        });
        return;
      }

      setHasContactsPermission(true);

      // Get contacts with phone numbers
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        // Filter contacts that have phone numbers and valid names
        const contactsWithPhones = data.filter(contact =>
          contact.phoneNumbers &&
          contact.phoneNumbers.length > 0 &&
          contact.phoneNumbers[0].number
        ).map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phone: contact.phoneNumbers[0].number
        }));

        if (contactsWithPhones.length > 0) {
          setPhoneContacts(contactsWithPhones);
          setContactSearchQuery('');
          setContactsModalVisible(true);
        } else {
          Toast.show({
            type: 'info',
            text1: 'No Contacts',
            text2: 'No contacts with phone numbers found',
            position: 'bottom',
          });
        }
      } else {
        Toast.show({
          type: 'info',
          text1: 'No Contacts',
          text2: 'No contacts found on your device',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error picking contact:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to access contacts',
        position: 'bottom',
      });
    }
  };

  const selectContactFromPicker = (contact: PhoneContact): void => {
    setContactsModalVisible(false);

    const phoneNumber = contact.phone.replace(/[^0-9]/g, '');
    const last10Digits = phoneNumber.slice(-10);

    setPhoneSearch(last10Digits);

    if (last10Digits.length >= 10) {
      // Check if client exists
      const existingClient = savedClients.find(c => c.phone === last10Digits);
      if (existingClient) {
        setClientInfo(existingClient);
        setSelectClientModalVisible(false);
        setPhoneSearch('');
        Toast.show({
          type: 'success',
          text1: 'Client Selected',
          text2: `${existingClient.name} has been selected`,
          position: 'bottom',
        });
      } else {
        // New contact - pre-fill name
        setClientName(contact.name);
        setShowNameInput(true);
      }
    } else {
      Toast.show({
        type: 'info',
        text1: 'Invalid Phone',
        text2: 'Contact phone number is too short',
        position: 'bottom',
      });
    }
  };

  const handlePhoneSearch = (phone: string): void => {
    const numericPhone = phone.replace(/[^0-9]/g, '');
    if (numericPhone.length <= 10) {
      setPhoneSearch(numericPhone);

      if (numericPhone.length === 10) {
        // Check if client exists
        const existingClient = savedClients.find(c => c.phone === numericPhone);
        if (existingClient) {
          setClientInfo(existingClient);
          setSelectClientModalVisible(false);
          setPhoneSearch('');
          Toast.show({
            type: 'success',
            text1: 'Client Selected',
            text2: `${existingClient.name} has been selected`,
            position: 'bottom',
          });
        } else {
          setShowNameInput(true);
        }
      } else {
        setShowNameInput(false);
      }
    }
  };

  const handleSaveNewClient = async (): Promise<void> => {
    if (!clientName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter client name',
        position: 'bottom',
      });
      return;
    }

    const newClient: SavedClient = {
      id: Date.now().toString(),
      name: clientName.trim(),
      phone: phoneSearch,
      address: clientAddress.trim(),
      email: clientEmail.trim(),
      gstNo: clientGstNo.trim(),
    };

    console.log('💾 Saving new client with address:', newClient);

    const result = await saveClient(newClient, false);

    if (result.success) {
      setSavedClients(result.clients);
      setClientInfo(newClient);
      console.log('✅ New client saved and set as clientInfo:', newClient);
      setSelectClientModalVisible(false);
      setPhoneSearch('');
      setClientName('');
      setClientAddress('');
      setClientEmail('');
      setClientGstNo('');
      setShowNameInput(false);

      const offlineMsg = (!isConnected || !isInternetReachable) ? ' (Saved offline)' : '';
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `New client added and selected${offlineMsg}`,
        position: 'bottom',
      });

      await updatePendingCount();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save client',
        position: 'bottom',
      });
    }
  };

  const handleSelectExistingClient = (client: SavedClient): void => {
    console.log('👤 Selecting client:', client.name, 'Address:', client.address);

    // Check if client has fields, if not, ensure empty strings
    const updatedClient: ClientInfo = {
      ...client,
      address: client.address || '',
      email: client.email || '',
      gstNo: client.gstNo || '',
    };

    console.log('📋 Updated client with all fields:', updatedClient);

    setClientInfo(updatedClient);
    setSelectClientModalVisible(false);
    setPhoneSearch('');
  };

  const handleUpdateClientAddress = async (address: string): Promise<void> => {
    console.log('🔄 Updating client address:', address);

    // Update clientInfo state
    const updatedClientInfo: ClientInfo = { ...clientInfo, address: address.trim() };
    setClientInfo(updatedClientInfo);

    console.log('📋 Updated clientInfo:', updatedClientInfo);

    // Update in saved clients list
    if (clientInfo.id) {
      try {
        const clients = await getClients();
        const updatedClients = clients.map(c =>
          c.id === clientInfo.id ? { ...updatedClientInfo, id: clientInfo.id } : c
        ) as SavedClient[];
        await saveLocalData(STORAGE_KEYS.CLIENTS, updatedClients);
        setSavedClients(updatedClients);
        console.log('✅ Client address saved to storage');
      } catch (error) {
        console.error('❌ Error updating client address:', error);
      }
    }
  };

  const handleDeleteItem = (itemId: string | undefined): void => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedItems = items.filter(item => item.id !== itemId);
            setItems(updatedItems);

            // Save locally to DRAFTS
            saveLocalData(STORAGE_KEYS.DRAFTS, [{
              items: updatedItems,
              details: invoiceDetails,
              businessInfo,
              updatedAt: new Date().toISOString(),
            }]);
          }
        }
      ]
    );
  };

  const handleGenerate = async (): Promise<void> => {
    // Validation
    if (items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please add at least one item to the invoice',
        position: 'bottom',
      });
      return;
    }

    if (!clientInfo || !clientInfo.name || !clientInfo.phone) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a client',
        position: 'bottom',
      });
      return;
    }

    const invoiceNumber = invoiceDetails.number;
    const subtotal = calculateSubTotal();
    const tax = calculateTotalTax();
    const discount = calculateTotalDiscount();
    const total = calculateGrandTotal();

    const invoiceData: InvoiceData = {
      number: invoiceNumber,
      items,
      businessInfo,
      clientInfo,
      invoiceDate: invoiceDetails.invoiceDate,
      dueDate: invoiceDetails.dueDate,
      subTotal: subtotal,
      tax: tax,
      discount: discount,
      total: total,
      grandTotal: total,
      paidAmount: 0,
      notes: '',
      additionalFees: additionalFees
    };

    // Try to create invoice via backend
    try {
      setIsSyncing(true);

      if (isConnected && isInternetReachable) {
        // CRITICAL: Check if any items don't have serverIds (offline items)
        const itemsNeedingSync = items.filter(item => !item.serverId);

        if (itemsNeedingSync.length > 0) {
          console.log(`⚠️ Found ${itemsNeedingSync.length} offline items, syncing first...`);

          // Sync pending items first
          const syncResult = await syncWithServer();

          if (syncResult.success) {
            // Reload items to get updated serverIds
            const updatedItems = await getItems();

            // Update invoice items with serverIds
            const itemsWithServerIds = items.map(invoiceItem => {
              const syncedItem = updatedItems.find(ui =>
                ui.id === invoiceItem.id || ui.serverId === invoiceItem.serverId
              );
              if (syncedItem && syncedItem.serverId) {
                return { ...invoiceItem, serverId: syncedItem.serverId };
              }
              return invoiceItem;
            });

            // Check if all items now have serverIds
            const stillMissingServerIds = itemsWithServerIds.filter(item => !item.serverId);
            if (stillMissingServerIds.length > 0) {
              console.error('❌ Some items still missing serverIds after sync');
              Toast.show({
                type: 'error',
                text1: 'Sync Failed',
                text2: 'Unable to sync offline items. Invoice will be saved offline.',
                position: 'bottom',
              });
              // Fall through to offline save
            } else {
              // Update invoice data with synced items
              invoiceData.items = itemsWithServerIds;
              console.log('✅ All items synced, creating invoice...');
            }
          } else {
            Toast.show({
              type: 'error',
              text1: 'Sync Issue',
              text2: 'Could not sync offline items. Invoice will be saved offline.',
              position: 'bottom',
            });
          }
        }

        let currentAttemptNumber = invoiceData.number;
        let finalInvoiceResult = null;
        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
          console.log(`📤 Generation attempt ${retryCount + 1} with number: ${currentAttemptNumber}`);
          const result = await createInvoiceViaBackend({ ...invoiceData, number: currentAttemptNumber });

          if (result.success) {
            finalInvoiceResult = result;
            break;
          } else if (result.error && result.error.includes('duplicate key error')) {
            retryCount++;
            const numericPart = parseInt(currentAttemptNumber.replace(/[^0-9]/g, ''));
            const prefix = currentAttemptNumber.includes('#') ? '#' : (currentAttemptNumber.includes('OFF-') ? 'OFF-' : '');
            currentAttemptNumber = prefix + String(numericPart + 1).padStart(6, '0');
            console.log(`🔄 Duplicate detected. Auto-incrementing to ${currentAttemptNumber}...`);

            // Update UI to show the new number being tried
            setInvoiceDetails(prev => ({ ...prev, number: currentAttemptNumber }));
            invoiceData.number = currentAttemptNumber;
          } else {
            throw new Error(result.error);
          }
        }

        if (!finalInvoiceResult) {
          throw new Error('Could not generate invoice after multiple serial number attempts. Please check manually.');
        }

        const result = finalInvoiceResult;
        if (result.success) {
          // Use backend's invoice number if available (in case backend assigns a different one)
          const backendInvoiceNumber = result.invoice?.invoiceNumber || result.invoice?.number || invoiceNumber;

          // If backend assigned a different invoice number, log it
          if (backendInvoiceNumber !== invoiceNumber) {
            console.log(`📝 Backend assigned different invoice number: ${invoiceNumber} → ${backendInvoiceNumber}`);
          }

          // Save pending payment record with complete invoice data
          const pending: PendingRecord = {
            id: result.invoice._id,
            invoiceNumber: backendInvoiceNumber, // Use backend's invoice number
            clientName: clientInfo.name,
            clientPhone: clientInfo.phone,
            amount: total,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: 'pending',
            createdAt: new Date().toISOString(),
            // Include full financial breakdown
            subtotal: subtotal,
            subTotal: subtotal,
            tax: tax,
            totalTax: tax,
            discount: discount,
            totalDiscount: discount,
            totalAmount: total,
            paidAmount: 0,
            additionalFees: additionalFees,
            customCharges: [],
            items: items,
            invoiceDate: invoiceDetails.invoiceDate,
            dueDate: invoiceDetails.dueDate,
          };

          const pendings = await AsyncStorage.getItem('@viveha_pendings');
          const pendingList: PendingRecord[] = pendings ? JSON.parse(pendings) : [];
          pendingList.push(pending);
          await AsyncStorage.setItem('@viveha_pendings', JSON.stringify(pendingList));

          await AsyncStorage.setItem(STORAGE_KEYS.PENDINGS_REFRESH_TRIGGER, Date.now().toString());

          // Check if this is the user's first invoice and redirect to rate us
          const hasCreatedFirstInvoice = await AsyncStorage.getItem('@viveha_first_invoice_created');
          if (!hasCreatedFirstInvoice) {
            // Mark that first invoice has been created
            await AsyncStorage.setItem('@viveha_first_invoice_created', 'true');
            // Navigate to Rate Us screen instead of InvoicePreview
            navigation.navigate('RateUs', { fromInvoiceCreation: true });
          } else {
            navigation.navigate('InvoicePreview', { invoice: { ...invoiceData, id: pending.id } });
          }

          // Clear form
          setItems([]);
          setAdditionalFees([]);
          setClientInfo({ name: '', phone: '', address: '', email: '', gstNo: '' });

          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Invoice created successfully!',
            position: 'bottom',
          });

          // Clear draft after successful creation
          await saveLocalData(STORAGE_KEYS.DRAFTS, []);
          await AsyncStorage.removeItem('@viveha_invoice_draft_tax');

          // Increment local counter and generate new invoice number
          const shopDetailsStr = await AsyncStorage.getItem('@viveha_shop_details');
          if (shopDetailsStr) {
            const details = JSON.parse(shopDetailsStr);
            details.invoiceCount = (details.invoiceCount || 0) + 1;
            await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(details));

            // Generate new invoice number based on connection status
            const newInvoiceNumber = await generateInvoiceNumber(!isConnected || !isInternetReachable);
            setInvoiceDetails(prev => ({
              ...prev,
              number: newInvoiceNumber
            }));
          }

          setIsSyncing(false);
          return;
        }
      }

      // Fallback to offline save
      const saved = await saveInvoiceLocally(invoiceData);

      if (saved) {
        const pending: PendingRecord = {
          id: Date.now().toString(),
          invoiceNumber: invoiceNumber,
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          amount: total,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
          createdAt: new Date().toISOString(),
          // Include full financial breakdown
          subtotal: subtotal,
          subTotal: subtotal,
          tax: tax,
          totalTax: tax,
          discount: discount,
          totalDiscount: discount,
          totalAmount: total,
          paidAmount: 0,
          additionalFees: additionalFees,
          customCharges: [],
          items: items,
          invoiceDate: invoiceDetails.invoiceDate,
          dueDate: invoiceDetails.dueDate,
        };

        const pendings = await AsyncStorage.getItem('@viveha_pendings');
        const pendingList: PendingRecord[] = pendings ? JSON.parse(pendings) : [];
        pendingList.push(pending);
        await AsyncStorage.setItem('@viveha_pendings', JSON.stringify(pendingList));
        await AsyncStorage.setItem(STORAGE_KEYS.PENDINGS_REFRESH_TRIGGER, Date.now().toString());

        // Check if this is the user's first invoice and redirect to rate us
        const hasCreatedFirstInvoice = await AsyncStorage.getItem('@viveha_first_invoice_created');
        if (!hasCreatedFirstInvoice) {
          // Mark that first invoice has been created
          await AsyncStorage.setItem('@viveha_first_invoice_created', 'true');
          // Navigate to Rate Us screen instead of InvoicePreview
          navigation.navigate('RateUs', { fromInvoiceCreation: true });
        } else {
          navigation.navigate('InvoicePreview', { invoice: { ...invoiceData, id: pending.id } });
        }

        setItems([]);
        setAdditionalFees([]);
        setClientInfo({ name: '', phone: '', address: '', email: '', gstNo: '' });

        // Clear draft after successful save
        await saveLocalData(STORAGE_KEYS.DRAFTS, []);
        await AsyncStorage.removeItem('@viveha_invoice_draft_tax');

        // Increment local counter and generate new invoice number
        const shopDetailsStr = await AsyncStorage.getItem('@viveha_shop_details');
        if (shopDetailsStr) {
          const details = JSON.parse(shopDetailsStr);
          details.invoiceCount = (details.invoiceCount || 0) + 1;
          await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(details));

          // Generate new invoice number with offline prefix if not connected
          const newInvoiceNumber = await generateInvoiceNumber(!isConnected || !isInternetReachable);
          setInvoiceDetails(prev => ({
            ...prev,
            number: newInvoiceNumber
          }));
        }

        const offlineMsg = (!isConnected || !isInternetReachable) ? ' (Will sync when online)' : '';
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Invoice saved${offlineMsg}`,
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to generate invoice',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);

      let errorMsg = error.message || 'Failed to generate invoice';
      if (errorMsg.includes('duplicate key error')) {
        errorMsg = 'Invoice Number ' + invoiceNumber + ' already exists. Please change the invoice number and try again.';
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg,
        position: 'bottom',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDueDateChange = (event: any, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      setShowDueDatePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowDueDatePicker(false);
      return;
    }

    if (selectedDate) {
      setSelectedDueDate(selectedDate);
      setInvoiceDetails({
        ...invoiceDetails,
        dueDate: formatDate(selectedDate),
      });

      if (Platform.OS === 'ios') {
        // On iOS, we keep the picker open until user explicitly closes it
        // So we don't hide it here
      }
    }
  };

  const handleMenuPress = (): void => {
    Alert.alert(
      'Options',
      'Choose an option',
      [
        {
          text: 'Sync Now',
          onPress: async () => {
            if (isConnected && isInternetReachable) {
              await performSync();
            } else {
              Toast.show({
                type: 'info',
                text1: 'Offline',
                text2: 'Cannot sync while offline',
                position: 'bottom',
              });
            }
          },
        },
        {
          text: 'Save as Draft',
          onPress: async () => {
            await saveLocalData(STORAGE_KEYS.DRAFTS, [{
              items,
              details: invoiceDetails,
              businessInfo,
              isDraft: true,
              updatedAt: new Date().toISOString(),
            }]);
            Alert.alert('Success', 'Draft saved locally!');
          },
        },
        {
          text: 'View Pending Syncs',
          onPress: async () => {
            const pending = await getPendingSyncItems();
            Toast.show({
              type: 'info',
              text1: 'Pending Syncs',
              text2: `${pending.length} items waiting to sync`,
              position: 'bottom',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Filter functions for search
  const filteredItems = availableItems.filter(item => {
    if (!itemSearchQuery.trim()) return true;
    const query = itemSearchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

  const filteredClients = savedClients.filter(client => {
    if (!clientSearchQuery.trim()) return true;
    const query = clientSearchQuery.toLowerCase();
    return client.name.toLowerCase().includes(query) ||
      client.phone.includes(query);
  });

  const filteredContacts = phoneContacts.filter(contact => {
    if (!contactSearchQuery.trim()) return true;
    const query = contactSearchQuery.toLowerCase();
    return contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(query);
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Sync Indicator */}
      <SyncIndicator
        isSyncing={isSyncing}
        isOnline={isConnected && isInternetReachable}
        pendingCount={pendingCount}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <Image
          source={require('../assets/pro.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INVOICE DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.invoiceDetailsRow}>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.detailLabel}>Number</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.detailValue} numberOfLines={1}>{invoiceDetails.number}</Text>
                  {invoiceDetails.number.startsWith('OFF-') && (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineBadgeText}>Offline</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.detailLabel}>Invoice Date</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{invoiceDetails.invoiceDate}</Text>
              </View>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{invoiceDetails.dueDate}</Text>
              </View>
              <View style={[styles.invoiceDetailItem, { alignItems: 'flex-end' }]}>
                <TouchableOpacity
                  style={styles.editIconContainer}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Ionicons name={"pencil" as any} size={22} color="#5D73F8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BUSINESS INFO</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={"business" as any} size={16} color="#E46269" />
                </View>
                <View>
                  <Text style={styles.infoTitle}>From</Text>
                  <Text style={styles.infoSubtitle}>{businessInfo.name}</Text>
                </View>
              </View>
              <Ionicons name={"chevron-forward" as any} size={18} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.infoRow}
              onPress={handleOpenClientModal}
            >
              <View style={styles.infoLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={"person" as any} size={16} color="#FF9A5F" />
                </View>
                <View style={styles.clientInfoText}>
                  <Text style={styles.infoTitle}>To</Text>
                  {clientInfo.name ? (
                    <>
                      <Text style={styles.infoSubtitle}>{clientInfo.name}</Text>
                      <Text style={styles.clientPhone}>{clientInfo.phone}</Text>
                    </>
                  ) : (
                    <Text style={styles.clientPlaceholder}>Tap to select client</Text>
                  )}
                </View>
              </View>
              <Ionicons name={"chevron-forward" as any} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Item Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
          <View style={styles.card}>
            {items.length === 0 ? (
              <View style={styles.emptyItemsState}>
                <Ionicons name={"cart-outline" as any} size={32} color="#ccc" />
                <Text style={styles.emptyItemsText}>No items added yet</Text>
                <Text style={styles.emptyItemsSubtext}>Tap "Add Item" to get started</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.itemRow}>
                    <View style={styles.itemMainInfo}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item.id)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name={"trash-outline" as any} size={18} color="#ff4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.itemPriceRow}>
                        <Text style={styles.itemPriceLabel}>Unit Price:</Text>
                        <Text style={styles.itemPrice}>Rs. {(item.price || 0).toFixed(2)}</Text>
                      </View>

                      {/* Quantity Controls */}
                      <View style={styles.quantityControl}>
                        <Text style={styles.quantityLabel}>Quantity:</Text>
                        <View style={styles.quantityButtons}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleDecreaseQuantity(item.id)}
                          >
                            <Ionicons name={"remove" as any} size={18} color="#E46269" />
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleIncreaseQuantity(item.id)}
                          >
                            <Ionicons name={"add" as any} size={18} color="#E46269" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {item.stockAvailable && (
                        <Text style={styles.stockInfo}>Stock: {item.stockAvailable} available</Text>
                      )}

                      {/* Item Total */}
                      <View style={styles.itemTotalRow}>
                        <Text style={styles.itemTotalLabel}>Item Total:</Text>
                        <Text style={styles.itemTotalValue}>
                          Rs. {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={handleAddItem}
            >
              <Ionicons name={"add-circle" as any} size={20} color="#fff" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total :</Text>
              <Text style={styles.totalValue}>Rs. {(calculateSubTotal() || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax {enableInvoiceTax && taxSettings.enableTaxCalculation && taxSettings.primaryTaxRate > 0
                  ? `(${taxSettings.primaryTaxRate}%)`
                  : '(0%)'} :
              </Text>
              <Text style={styles.totalValue}>Rs. {(calculateTotalTax() || 0).toFixed(2)}</Text>
            </View>
            {additionalFees.map((fee) => (
              <View key={fee.id} style={styles.totalRow}>
                <View style={styles.feeRowWithRemove}>
                  <Text style={styles.totalLabel}>{fee.name} :</Text>
                  <TouchableOpacity
                    onPress={() => setAdditionalFees(additionalFees.filter(f => f.id !== fee.id))}
                    style={styles.removeFeeButton}
                  >
                    <Ionicons name={"close-circle" as any} size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.totalValue}>Rs. {fee.amount.toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total :</Text>
              <Text style={styles.grandTotalValue}>Rs. {(calculateGrandTotal() || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Add Additional Fee Button */}
        <TouchableOpacity
          style={styles.addNewCardButton}
          onPress={() => {
            setFeeName('');
            setFeeAmount('');
            setAddFeeModalVisible(true);
          }}
        >
          <Ionicons name={"add" as any} size={20} color="#333" />
          <Text style={styles.addNewCardText}>Add New Card</Text>
        </TouchableOpacity>

        {/* Enable Tax Toggle */}
        <View style={styles.taxToggleContainer}>
          <Text style={styles.taxToggleLabel}>Enable Tax</Text>
          <Switch
            trackColor={{ false: '#f4f3f4', true: '#E46269' }}
            thumbColor={enableInvoiceTax ? '#fff' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={(val) => {
              setEnableInvoiceTax(val);
              AsyncStorage.setItem('@viveha_invoice_draft_tax', JSON.stringify(val));
            }}
            value={enableInvoiceTax}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => {
              if (items.length === 0) {
                Toast.show({
                  type: 'info',
                  text1: 'Preview',
                  text2: 'Add items to preview invoice',
                  position: 'bottom',
                });
                return;
              }
              returningFromPreviewRef.current = true;
              saveLocalData(STORAGE_KEYS.DRAFTS, [{
                items,
                details: invoiceDetails,
                businessInfo,
                clientInfo,
                updatedAt: new Date().toISOString(),
              }]);
              const previewData = {
                number: invoiceDetails.number,
                items,
                businessInfo,
                clientInfo,
                invoiceDate: invoiceDetails.invoiceDate,
                dueDate: invoiceDetails.dueDate,
                subTotal: calculateSubTotal(),
                tax: calculateTotalTax(),
                discount: calculateTotalDiscount(),
                total: calculateGrandTotal(),
                additionalFees: additionalFees,
              };
              navigation.navigate('InvoicePreview', { invoice: previewData, isPreview: true });
            }}
          >
            <Ionicons name={"eye-outline" as any} size={20} color="#666" />
            <Text style={styles.previewText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
          >
            <Ionicons name={"document-text-outline" as any} size={20} color="#fff" />
            <Text style={styles.generateText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Client Selection Modal */}
      <Modal
        visible={selectClientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectClientModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setSelectClientModalVisible(false)}>
                <Ionicons name={"close" as any} size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
              {/* Phone Number Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <Text style={styles.charCount}>{phoneSearch.length}/10</Text>
                </View>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10 digit phone number"
                    placeholderTextColor="#999"
                    value={phoneSearch}
                    onChangeText={handlePhoneSearch}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={styles.contactsButton}
                    onPress={handlePickContact}
                  >
                    <Ionicons name={"people" as any} size={24} color="#E46269" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name Input (shown when new number) */}
              {showNameInput && phoneSearch.length === 10 && (
                <View style={styles.newClientSection}>
                  <Text style={styles.newClientLabel}>New Client - Enter Details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Client Name *</Text>
                    <TextInput
                      style={styles.clientNameInput}
                      placeholder="Enter client name"
                      placeholderTextColor="#999"
                      value={clientName}
                      onChangeText={setClientName}
                      autoFocus
                    />
                  </View>

                  {/* Conditionally show Address field */}
                  {customerFieldSettings.address && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Client Address</Text>
                      <TextInput
                        style={styles.clientNameInput}
                        placeholder="Enter client address"
                        placeholderTextColor="#999"
                        value={clientAddress}
                        onChangeText={setClientAddress}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  )}

                  {/* Conditionally show Email field */}
                  {customerFieldSettings.emailId && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email ID</Text>
                      <TextInput
                        style={styles.clientNameInput}
                        placeholder="Enter email address"
                        placeholderTextColor="#999"
                        value={clientEmail}
                        onChangeText={setClientEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  {/* Conditionally show GST Number field */}
                  {customerFieldSettings.gstNo && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>GST Number</Text>
                      <TextInput
                        style={styles.clientNameInput}
                        placeholder="Enter GST number"
                        placeholderTextColor="#999"
                        value={clientGstNo}
                        onChangeText={setClientGstNo}
                        autoCapitalize="characters"
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveClientButton}
                    onPress={handleSaveNewClient}
                  >
                    <Text style={styles.saveClientButtonText}>Save & Select Client</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Search Bar for Clients */}
              {!showNameInput && savedClients.length > 0 && (
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Ionicons name={"search" as any} size={20} color="#999" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search clients by name or phone..."
                      placeholderTextColor="#999"
                      value={clientSearchQuery}
                      onChangeText={setClientSearchQuery}
                    />
                    {clientSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                        <Ionicons name={"close-circle" as any} size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Saved Clients List */}
              {!showNameInput && savedClients.length > 0 && (
                <View style={styles.savedClientsSection}>
                  <View style={styles.clientsListHeader}>
                    <Text style={styles.savedClientsTitle}>Recent Clients</Text>
                    {clientSearchQuery.length > 0 && (
                      <Text style={styles.resultCount}>
                        {filteredClients.length} result{filteredClients.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <ScrollView style={styles.clientsList}>
                    {filteredClients.length === 0 ? (
                      <View style={styles.emptySearchContainer}>
                        <Ionicons name={"search-outline" as any} size={50} color="#ccc" />
                        <Text style={styles.emptySearchText}>No matching clients found</Text>
                      </View>
                    ) : (
                      filteredClients.slice().reverse().slice(0, 10).map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={styles.clientItem}
                          onPress={() => handleSelectExistingClient(client)}
                        >
                          <View style={styles.clientItemIcon}>
                            <Ionicons name={"person" as any} size={20} color="#E46269" />
                          </View>
                          <View style={styles.clientItemInfo}>
                            <Text style={styles.clientItemName}>{client.name}</Text>
                            <Text style={styles.clientItemPhone}>{client.phone}</Text>
                            {client.address && (
                              <Text style={styles.clientItemAddress} numberOfLines={1}>📍 {client.address}</Text>
                            )}
                            {client.email && (
                              <Text style={styles.clientItemAddress} numberOfLines={1}>✉️ {client.email}</Text>
                            )}
                            {client.gstNo && (
                              <Text style={styles.clientItemAddress} numberOfLines={1}>🏢 {client.gstNo}</Text>
                            )}
                          </View>
                          <Ionicons name={"chevron-forward" as any} size={20} color="#999" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {savedClients.length === 0 && !showNameInput && (
                <View style={styles.emptyClientsContainer}>
                  <Ionicons name={"people-outline" as any} size={60} color="#ccc" />
                  <Text style={styles.emptyClientsText}>No saved clients yet</Text>
                  <Text style={styles.emptyClientsSubtext}>Enter a phone number to add your first client</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Selection Modal */}
      <Modal
        visible={selectItemModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectItemModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => setSelectItemModalVisible(false)}>
                <Ionicons name={"close" as any} size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Bar for Items */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name={"search" as any} size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items by name..."
                  placeholderTextColor="#999"
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                />
                {itemSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setItemSearchQuery('')}>
                    <Ionicons name={"close-circle" as any} size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Ionicons name={(itemSearchQuery.length > 0 ? "search-outline" : "cube-outline") as any} size={60} color="#ccc" />
                  <Text style={styles.emptyItemsText}>
                    {itemSearchQuery.length > 0 ? 'No matching items' : 'No items available'}
                  </Text>
                  {itemSearchQuery.length === 0 && (
                    <TouchableOpacity
                      style={styles.goToItemsButton}
                      onPress={() => {
                        setSelectItemModalVisible(false);
                        navigation.navigate('Items');
                      }}
                    >
                      <Text style={styles.goToItemsButtonText}>Go to Items</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.selectableItem}
                    onPress={() => handleSelectItem(item)}
                    disabled={item.stock === 0}
                  >
                    <View style={styles.selectableItemLeft}>
                      <View style={styles.selectableItemIcon}>
                        <Ionicons name={"cube" as any} size={20} color="#E46269" />
                      </View>
                      <View>
                        <Text style={styles.selectableItemName}>{item.name}</Text>
                        <View style={styles.selectableItemPrices}>
                          <View style={styles.selectablePriceItem}>
                            <Text style={styles.selectablePriceLabel}>Actual:</Text>
                            <Text style={styles.selectableActualPrice}>
                              Rs.{((item.actualPrice !== undefined ? item.actualPrice : item.amount) || 0).toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.selectablePriceItem}>
                            <Text style={styles.selectablePriceLabel}>Sale:</Text>
                            <Text style={styles.selectableSalePrice}>
                              Rs.{((item.salePrice !== undefined ? item.salePrice : item.price) || 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.selectableItemStock,
                          item.stock === 0 && styles.outOfStockText
                        ]}>
                          {item.stock === 0 ? 'Out of Stock' : `Stock: ${item.stock}`}
                        </Text>
                      </View>
                    </View>
                    {item.stock > 0 && (
                      <Ionicons name={"add-circle" as any} size={24} color="#E46269" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Phone Contacts Modal */}
      <Modal
        visible={contactsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select from Contacts</Text>
              <TouchableOpacity onPress={() => setContactsModalVisible(false)}>
                <Ionicons name={"close" as any} size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Bar for Contacts */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name={"search" as any} size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts by name or phone..."
                  placeholderTextColor="#999"
                  value={contactSearchQuery}
                  onChangeText={setContactSearchQuery}
                />
                {contactSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                    <Ionicons name={"close-circle" as any} size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredContacts.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Ionicons name={(contactSearchQuery.length > 0 ? "search-outline" : "people-outline") as any} size={60} color="#ccc" />
                  <Text style={styles.emptyItemsText}>
                    {contactSearchQuery.length > 0 ? 'No matching contacts' : 'No contacts found'}
                  </Text>
                </View>
              ) : (
                filteredContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.clientItem}
                    onPress={() => selectContactFromPicker(contact)}
                  >
                    <View style={styles.clientItemIcon}>
                      <Ionicons name={"person" as any} size={20} color="#E46269" />
                    </View>
                    <View style={styles.clientItemInfo}>
                      <Text style={styles.clientItemName}>{contact.name}</Text>
                      <Text style={styles.clientItemPhone}>{contact.phone}</Text>
                    </View>
                    <Ionicons name={"chevron-forward" as any} size={20} color="#999" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Due Date Picker */}
      {showDueDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDueDatePicker}
          onRequestClose={() => setShowDueDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDueDatePicker(false)}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              <DateTimePicker
                value={selectedDueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDueDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Add Fee Modal */}
      <Modal
        visible={addFeeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddFeeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={styles.modalOverlay}
        >
          <View style={styles.addFeeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Additional Fee</Text>
              <TouchableOpacity
                onPress={() => setAddFeeModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name={"close" as any} size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.addFeeModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.feeInputLabel}>Fee Name</Text>
                <View style={styles.feeInputContainer}>
                  <Ionicons name={"pricetag-outline" as any} size={20} color="#E46269" />
                  <TextInput
                    style={styles.feeInput}
                    placeholder="e.g., Delivery Fee, Labour Charge"
                    placeholderTextColor="#999"
                    value={feeName}
                    onChangeText={setFeeName}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.feeInputLabel}>Amount (Rs.)</Text>
                <View style={styles.feeInputContainer}>
                  <Ionicons name={"cash-outline" as any} size={20} color="#E46269" />
                  <TextInput
                    style={styles.feeInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    value={feeAmount}
                    onChangeText={setFeeAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.addFeeButton,
                  (!feeName || !feeAmount) && styles.addFeeButtonDisabled
                ]}
                disabled={!feeName || !feeAmount}
                onPress={() => {
                  if (feeName && feeAmount) {
                    const newFee: AdditionalFee = {
                      id: Date.now().toString(),
                      name: feeName,
                      amount: parseFloat(feeAmount) || 0,
                    };
                    setAdditionalFees([...additionalFees, newFee]);
                    setAddFeeModalVisible(false);
                    setFeeName('');
                    setFeeAmount('');
                    Toast.show({
                      type: 'success',
                      text1: 'Fee Added',
                      text2: `${feeName} has been added to the invoice`,
                      position: 'bottom',
                    });
                  }
                }}
              >
                <Ionicons name={"checkmark-circle-outline" as any} size={20} color="#fff" />
                <Text style={styles.addFeeButtonText}>Add Fee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Footer */}
      <Footer activeTab="AddInvoice" navigation={navigation} />
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
    paddingTop: 50,
    paddingBottom: 15,

  },
  logo: {
    width: 35,
    height: 35,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
  },
  invoiceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  offlineBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offlineBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 0,
  },
  infoSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  clientInfoText: {
    flex: 1,
  },
  clientPhone: {
    fontSize: 10,
    color: '#666',
  },
  clientPlaceholder: {
    fontSize: 11,
    color: '#ccc',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },
  itemRow: {
    paddingVertical: 10,
  },
  itemMainInfo: {
    width: '100%',
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemPriceLabel: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E46269',
  },
  quantityControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quantityLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E46269',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  stockInfo: {
    fontSize: 11,
    color: '#4CAF50',
    marginBottom: 10,
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 5,
  },
  itemTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptyItemsState: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  emptyItemsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 8,
    marginBottom: 10,
  },
  emptyItemsSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 5,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E46269',
    borderRadius: 25,
    paddingVertical: 10,
    marginTop: 15,
    gap: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalValue: {
    fontSize: 13,
    color: '#666',
  },
  feeRowWithRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeFeeButton: {
    padding: 2,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  addNewCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 8,
  },
  addNewCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  taxToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  taxToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    gap: 15,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97F48',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  generateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacing: {
    height: 20,
  }, modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '80%',
    height: '80%',
    width: '100%',
  },
  addFeeModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 20,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    padding: 20,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  goToItemsButton: {
    backgroundColor: '#E46269',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  goToItemsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  selectableItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectableItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectableItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectableItemPrices: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  selectablePriceItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  selectablePriceLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  selectableActualPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  selectableSalePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E46269',
  },
  selectableItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E46269',
    marginBottom: 2,
  },
  selectableItemStock: {
    fontSize: 12,
    color: '#666',
  },
  outOfStockText: {
    color: '#F44336',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  addFeeModalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  feeInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  feeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E46269',
    gap: 10,
  },
  feeInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  addFeeButton: {
    flexDirection: 'row',
    backgroundColor: '#E46269',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
    shadowColor: '#E46269',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addFeeButtonDisabled: {
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  addFeeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  clientNameInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 2,
    borderColor: '#E46269',
  },

  contactsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E46269',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  newClientSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  newClientLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9A5F',
    marginBottom: 15,
  },
  saveClientButton: {
    backgroundColor: '#E46269',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveClientButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  saveClientButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savedClientsSection: {
    marginTop: 10,
  },
  savedClientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  clientsList: {
    maxHeight: 300,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  clientItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientItemInfo: {
    flex: 1,
  },
  clientItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  clientItemPhone: {
    fontSize: 13,
    color: '#666',
  },
  clientItemAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyClientsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyClientsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptyClientsSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'center',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarIcon: {
    marginLeft: 4,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B8EFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  resultCount: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  clientsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
});
