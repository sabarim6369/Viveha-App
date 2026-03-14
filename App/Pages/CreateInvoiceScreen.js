import React, { useState, useEffect } from 'react';
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
} from 'react-native';
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

export default function CreateInvoiceScreen({ navigation }) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectItemModalVisible, setSelectItemModalVisible] = useState(false);
  const [selectClientModalVisible, setSelectClientModalVisible] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [savedClients, setSavedClients] = useState([]);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default 30 days from now
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  
  // Voice billing states
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);

  // Customer field settings
  const [customerFieldSettings, setCustomerFieldSettings] = useState({
    address: false,
    emailId: false,
    gstNo: false,
  });

  // Additional client fields
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientGST, setClientGST] = useState('');

  const [items, setItems] = useState([]);

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [invoiceDetails, setInvoiceDetails] = useState({
    number: '#000002',
    invoiceDate: formatDate(new Date()), // Current date
    dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
  });

  const [businessInfo, setBusinessInfo] = useState({
    name: 'My Shop',
    address: '',
    phone: '',
    email: '',
  });

  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
  });

  // Load data from local storage on mount
  useEffect(() => {
    loadLocalData();
    loadAvailableItems();
    loadClients();
    loadCustomerFieldSettings();
  }, []);

  // Reload settings when modal opens
  useEffect(() => {
    if (selectClientModalVisible) {
      loadCustomerFieldSettings();
    }
  }, [selectClientModalVisible]);

  const loadAvailableItems = async () => {
    try {
      const loadedItems = await getItems();
      setAvailableItems(loadedItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadClients = async () => {
    try {
      const loadedClients = await getClients();
      setSavedClients(loadedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCustomerFieldSettings = async () => {
    try {
      const settings = await getLocalData(STORAGE_KEYS.USER_SETTINGS);
      console.log('Loading customer field settings:', settings);
      if (settings && settings.customerFields) {
        console.log('Setting customer fields:', settings.customerFields);
        setCustomerFieldSettings(settings.customerFields);
      } else {
        console.log('No customer field settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading customer field settings:', error);
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

  const loadLocalData = async () => {
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

  const updatePendingCount = async () => {
    const pending = await getPendingSyncByType();
    setPendingCount(pending.total);
  };

  const checkAndSync = async () => {
    const pending = await getPendingSyncByType();
    if (pending.total > 0) {
      await performSync();
    }
  };

  const performSync = async () => {
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

  const saveInvoiceLocally = async (invoiceData) => {
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

  const calculateItemTotal = (item) => {
    const subtotal = item.price;
    const taxAmount = (subtotal * item.tax) / 100;
    const discountAmount = (subtotal * item.discount) / 100;
    return subtotal + taxAmount - discountAmount;
  };

  const calculateSubTotal = () => {
    return items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum, item) => sum + (((item.price || 0) * (item.quantity || 0) * (item.tax || 0)) / 100), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => sum + (((item.price || 0) * (item.quantity || 0) * (item.discount || 0)) / 100), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubTotal() + calculateTotalTax() - calculateTotalDiscount();
  };

  const handleAddItem = () => {
    setItemSearchQuery('');
    setSelectItemModalVisible(true);
  };

  const handleOpenVoiceModal = () => {
    setVoiceModalVisible(true);
    setVoiceTranscript('');
    setRecentlyAddedItems([]);
  };

  const handleStartListening = () => {
    setIsListening(true);
    // Simulate voice recognition (in real app, use expo-speech or similar)
    setTimeout(() => {
      setVoiceTranscript('2 pieces of BOSCH Splender Plus Plug...');
      setIsListening(false);
      
      // Find and add the item
      const foundItem = availableItems.find(item => 
        item.name.toLowerCase().includes('bosch') || 
        item.name.toLowerCase().includes('splender')
      );
      
      if (foundItem) {
        const newItem = {
          id: Date.now(),
          serverId: foundItem.serverId || foundItem.id,
          name: foundItem.name,
          quantity: 2,
          unit: 'Nos',
          price: foundItem.amount,
          tax: 0,
          discount: 0,
          stockAvailable: foundItem.stock,
        };
        setRecentlyAddedItems([newItem]);
      }
    }, 2000);
  };

  const handleDoneAdding = () => {
    // Add recently added items to the main items list
    if (recentlyAddedItems.length > 0) {
      const updatedItems = [...items, ...recentlyAddedItems];
      setItems(updatedItems);
      
      // Save locally to DRAFTS
      saveLocalData(STORAGE_KEYS.DRAFTS, [{
        items: updatedItems,
        details: invoiceDetails,
        businessInfo,
        updatedAt: new Date().toISOString(),
      }]);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${recentlyAddedItems.length} item(s) added via voice!`,
        position: 'bottom',
      });
    }
    
    setVoiceModalVisible(false);
    setRecentlyAddedItems([]);
    setVoiceTranscript('');
  };

  const handleSelectItem = (selectedItem) => {
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Item quantity increased!' + (!isConnected ? ' (Saved offline)' : ''),
        position: 'bottom',
      });
    } else {
      // Item doesn't exist, add new
      const newItem = {
        id: Date.now(),
        serverId: selectedItem.serverId || selectedItem.id, // Backend item ID for stock deduction
        name: selectedItem.name,
        quantity: 1,
        unit: 'Nos',
        price: selectedItem.amount,
        tax: 0,
        discount: 0,
        stockAvailable: selectedItem.stock,
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);

      // Save locally to DRAFTS
      saveLocalData(STORAGE_KEYS.DRAFTS, [{
        items: updatedItems,
        details: invoiceDetails,
        businessInfo,
        updatedAt: new Date().toISOString(),
      }]);

      setSelectItemModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Item added to invoice!' + (!isConnected ? ' (Saved offline)' : ''),
        position: 'bottom',
      });
    }
  };

  const handleIncreaseQuantity = (itemId) => {
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

  const handleDecreaseQuantity = (itemId) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId && item.quantity > 1) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleOpenClientModal = () => {
    setPhoneSearch('');
    setClientName('');
    setClientAddress('');
    setClientEmail('');
    setClientGST('');
    setShowNameInput(false);
    setClientSearchQuery('');
    setSelectClientModalVisible(true);
  };

  const handlePickContact = async () => {
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

  const selectContactFromPicker = (contact) => {
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

  const handlePhoneSearch = (phone) => {
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

  const handleSaveNewClient = async () => {
    if (!clientName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter client name',
        position: 'bottom',
      });
      return;
    }

    const newClient = {
      id: Date.now().toString(),
      name: clientName.trim(),
      phone: phoneSearch,
    };

    // Only include optional fields if they're enabled in settings
    if (customerFieldSettings.address) {
      newClient.address = clientAddress.trim();
    }
    if (customerFieldSettings.emailId) {
      newClient.emailId = clientEmail.trim();
    }
    if (customerFieldSettings.gstNo) {
      newClient.gstNo = clientGST.trim();
    }

    const result = await saveClient(newClient, false);

    if (result.success) {
      setSavedClients(result.clients);
      setClientInfo(newClient);
      setSelectClientModalVisible(false);
      setPhoneSearch('');
      setClientName('');
      setClientAddress('');
      setClientEmail('');
      setClientGST('');
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

  const handleSelectExistingClient = (client) => {
    setClientInfo(client);
    setSelectClientModalVisible(false);
    setPhoneSearch('');
  };

  const handleDeleteItem = (itemId) => {
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

  const handleGenerate = async () => {
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

    const invoiceNumber = `INV-${Date.now()}`;
    const subtotal = calculateSubTotal();
    const tax = calculateTotalTax();
    const discount = calculateTotalDiscount();
    const total = calculateGrandTotal();

    const invoiceData = {
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
      notes: ''
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
              type: 'warning',
              text1: 'Sync Issue',
              text2: 'Could not sync offline items. Invoice will be saved offline.',
              position: 'bottom',
            });
          }
        }

        const result = await createInvoiceViaBackend(invoiceData);

        if (result.success) {
          // Save pending payment record
          const pending = {
            id: result.invoice._id,
            invoiceNumber: invoiceNumber,
            clientName: clientInfo.name,
            clientPhone: clientInfo.phone,
            amount: total,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: 'pending',
            createdAt: new Date().toISOString(),
          };

          const pendings = await AsyncStorage.getItem('@viveha_pendings');
          const pendingList = pendings ? JSON.parse(pendings) : [];
          pendingList.push(pending);
          await AsyncStorage.setItem('@viveha_pendings', JSON.stringify(pendingList));

          // Navigate to preview
          navigation.navigate('InvoicePreview', { invoice: { ...invoiceData, id: pending.id } });

          // Clear form
          setItems([]);
          setClientInfo({ name: '', phone: '' });

          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Invoice created successfully!',
            position: 'bottom',
          });

          // Clear draft after successful creation
          await saveLocalData(STORAGE_KEYS.DRAFTS, []);

          setIsSyncing(false);
          return;
        }
      }

      // Fallback to offline save
      const saved = await saveInvoiceLocally(invoiceData);

      if (saved) {
        const pending = {
          id: Date.now().toString(),
          invoiceNumber: invoiceNumber,
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          amount: total,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        const pendings = await AsyncStorage.getItem('@viveha_pendings');
        const pendingList = pendings ? JSON.parse(pendings) : [];
        pendingList.push(pending);
        await AsyncStorage.setItem('@viveha_pendings', JSON.stringify(pendingList));

        navigation.navigate('InvoicePreview', { invoice: { ...invoiceData, id: pending.id } });

        setItems([]);
        setClientInfo({ name: '', phone: '' });

        // Clear draft after successful save
        await saveLocalData(STORAGE_KEYS.DRAFTS, []);

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
    } catch (error) {
      console.error('Error generating invoice:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to generate invoice',
        position: 'bottom',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDueDateChange = (event, selectedDate) => {
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

  const handleMenuPress = () => {
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
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INVOICE DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.invoiceDetailsRow}>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.detailLabel}>Number</Text>
                <Text style={styles.detailValue}>{invoiceDetails.number}</Text>
              </View>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.detailLabel}>Invoice Date</Text>
                <Text style={styles.detailValue}>{invoiceDetails.invoiceDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.invoiceDetailItem}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{invoiceDetails.dueDate}</Text>
              </TouchableOpacity>
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
                  <Ionicons name="business" size={20} color="#E88E99" />
                </View>
                <View>
                  <Text style={styles.infoTitle}>From</Text>
                  <Text style={styles.infoSubtitle}>{businessInfo.name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.infoRow}
              onPress={handleOpenClientModal}
            >
              <View style={styles.infoLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person" size={20} color="#FF9A5F" />
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
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Item Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
          <View style={styles.card}>
            {items.length === 0 ? (
              <View style={styles.emptyItemsState}>
                <Ionicons name="cart-outline" size={50} color="#ccc" />
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
                          <Ionicons name="trash-outline" size={18} color="#ff4444" />
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
                            <Ionicons name="remove" size={18} color="#E88E99" />
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleIncreaseQuantity(item.id)}
                          >
                            <Ionicons name="add" size={18} color="#E88E99" />
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

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddItem}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={handleOpenVoiceModal}
              >
                <Ionicons name="mic" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
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
              <Text style={styles.totalLabel}>Tax (0%) :</Text>
              <Text style={styles.totalValue}>Rs. {(calculateTotalTax() || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount (0%) :</Text>
              <Text style={styles.totalValue}>Rs. {(calculateTotalDiscount() || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total :</Text>
              <Text style={styles.grandTotalValue}>Rs. {(calculateGrandTotal() || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Add New Card Button */}
        <TouchableOpacity style={styles.addNewCardButton}>
          <Ionicons name="add" size={20} color="#333" />
          <Text style={styles.addNewCardText}>Add New Card</Text>
        </TouchableOpacity>

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
              const previewData = {
                number: `#INV${Date.now().toString().slice(-6)}`,
                items,
                businessInfo,
                clientInfo,
                invoiceDate: invoiceDetails.invoiceDate,
                dueDate: invoiceDetails.dueDate,
                subTotal: calculateSubTotal(),
                tax: calculateTotalTax(),
                discount: calculateTotalDiscount(),
                total: calculateGrandTotal(),
              };
              navigation.navigate('InvoicePreview', { invoice: previewData, isPreview: true });
            }}
          >
            <Ionicons name="eye-outline" size={20} color="#666" />
            <Text style={styles.previewText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
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
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectClientModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Client</Text>
                <TouchableOpacity onPress={() => setSelectClientModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalBody}>
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
                      value={phoneSearch}
                      onChangeText={handlePhoneSearch}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <TouchableOpacity
                      style={styles.contactsButton}
                      onPress={handlePickContact}
                    >
                      <Ionicons name="people" size={24} color="#E88E99" />
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
                    
                    {/* Additional Fields Based on Settings */}
                    {console.log('Rendering with settings:', customerFieldSettings)}
                    {customerFieldSettings.address === true && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Address</Text>
                        <TextInput
                          style={[styles.clientNameInput, styles.multilineInput]}
                          placeholder="Enter client address (optional)"
                          placeholderTextColor="#999"
                          value={clientAddress}
                          onChangeText={setClientAddress}
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    )}
                    
                    {customerFieldSettings.emailId === true && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email ID</Text>
                        <TextInput
                          style={styles.clientNameInput}
                          placeholder="Enter email address (optional)"
                          placeholderTextColor="#999"
                          value={clientEmail}
                          onChangeText={setClientEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                    )}
                    
                    {customerFieldSettings.gstNo === true && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>GST Number</Text>
                        <TextInput
                          style={styles.clientNameInput}
                          placeholder="Enter GST number (optional)"
                          placeholderTextColor="#999"
                          value={clientGST}
                          onChangeText={setClientGST}
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
                      <Ionicons name="search" size={20} color="#999" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search clients by name or phone..."
                        placeholderTextColor="#999"
                        value={clientSearchQuery}
                        onChangeText={setClientSearchQuery}
                      />
                      {clientSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                          <Ionicons name="close-circle" size={20} color="#999" />
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
                  <ScrollView style={styles.clientsList} nestedScrollEnabled={true}>
                    {filteredClients.length === 0 ? (
                      <View style={styles.emptySearchContainer}>
                        <Ionicons name="search-outline" size={50} color="#ccc" />
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
                            <Ionicons name="person" size={20} color="#E88E99" />
                          </View>
                          <View style={styles.clientItemInfo}>
                            <Text style={styles.clientItemName}>{client.name}</Text>
                            <Text style={styles.clientItemPhone}>{client.phone}</Text>
                            {customerFieldSettings.address && client.address && (
                              <Text style={styles.clientItemDetail}>{client.address}</Text>
                            )}
                            {customerFieldSettings.emailId && client.emailId && (
                              <Text style={styles.clientItemDetail}>{client.emailId}</Text>
                            )}
                            {customerFieldSettings.gstNo && client.gstNo && (
                              <Text style={styles.clientItemDetail}>GST: {client.gstNo}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {savedClients.length === 0 && !showNameInput && (
                <View style={styles.emptyClientsContainer}>
                  <Ionicons name="people-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyClientsText}>No saved clients yet</Text>
                  <Text style={styles.emptyClientsSubtext}>Enter a phone number to add your first client</Text>
                </View>
              )}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Item Selection Modal */}
      <Modal
        visible={selectItemModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => setSelectItemModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Bar for Items */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items by name..."
                  placeholderTextColor="#999"
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                />
                {itemSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setItemSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Ionicons name={itemSearchQuery.length > 0 ? "search-outline" : "cube-outline"} size={60} color="#ccc" />
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
                        <Ionicons name="cube" size={20} color="#E88E99" />
                      </View>
                      <View>
                        <Text style={styles.selectableItemName}>{item.name}</Text>
                        <Text style={styles.selectableItemPrice}>Rs.{(item.amount || 0).toFixed(2)}</Text>
                        <Text style={[
                          styles.selectableItemStock,
                          item.stock === 0 && styles.outOfStockText
                        ]}>
                          {item.stock === 0 ? 'Out of Stock' : `Stock: ${item.stock}`}
                        </Text>
                      </View>
                    </View>
                    {item.stock > 0 && (
                      <Ionicons name="add-circle" size={24} color="#E88E99" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Phone Contacts Modal */}
      <Modal
        visible={contactsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select from Contacts</Text>
              <TouchableOpacity onPress={() => setContactsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Bar for Contacts */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts by name or phone..."
                  placeholderTextColor="#999"
                  value={contactSearchQuery}
                  onChangeText={setContactSearchQuery}
                />
                {contactSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredContacts.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Ionicons name={contactSearchQuery.length > 0 ? "search-outline" : "people-outline"} size={60} color="#ccc" />
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
                      <Ionicons name="person" size={20} color="#E88E99" />
                    </View>
                    <View style={styles.clientItemInfo}>
                      <Text style={styles.clientItemName}>{contact.name}</Text>
                      <Text style={styles.clientItemPhone}>{contact.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
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

      {/* Voice Billing Modal */}
      <Modal
        visible={voiceModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <SafeAreaView style={styles.voiceModalContainer}>
          {/* Header */}
          <View style={styles.voiceModalHeader}>
            <TouchableOpacity onPress={() => setVoiceModalVisible(false)}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
            <Text style={styles.voiceModalTitle}>Voice Billing</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Transcript Section */}
          <View style={styles.transcriptSection}>
            <Text style={styles.transcriptLabel}>LIVE TRANSCRIPT</Text>
            <Text style={styles.transcriptText}>
              {voiceTranscript || 'Start speaking to add items...'}
            </Text>
          </View>

          {/* Microphone Button */}
          <View style={styles.microphoneContainer}>
            <TouchableOpacity
              style={styles.microphoneButton}
              onPress={handleStartListening}
              disabled={isListening}
            >
              <View style={[styles.micCircle, isListening && styles.micCircleAnimated]}>
                <View style={[styles.micCircle2, isListening && styles.micCircle2Animated]}>
                  <View style={[styles.micCircle3, isListening && styles.micCircle3Animated]}>
                    <View style={styles.micInner}>
                      <Ionicons name="mic" size={32} color="#fff" />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.listeningText}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
          </View>

          {/* Recently Added Section */}
          <View style={styles.recentlyAddedSection}>
            <Text style={styles.recentlyAddedTitle}>Recently Added</Text>
            {recentlyAddedItems.length > 0 ? (
              <View>
                {recentlyAddedItems.map((item, index) => (
                  <View key={index} style={styles.recentlyAddedItem}>
                    <View style={styles.recentlyAddedLeft}>
                      <Text style={styles.recentlyAddedName}>{item.name}</Text>
                      <Text style={styles.recentlyAddedQuantity}>x {item.quantity} pieces</Text>
                    </View>
                    <View style={styles.recentlyAddedRight}>
                      <TouchableOpacity onPress={() => {
                        // Edit functionality
                      }}>
                        <Ionicons name="create-outline" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setRecentlyAddedItems(recentlyAddedItems.filter((_, i) => i !== index));
                      }} style={{ marginLeft: 10 }}>
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noItemsText}>No items added yet</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.voiceActionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setVoiceModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneAddingButton}
              onPress={handleDoneAdding}
            >
              <Text style={styles.doneAddingButtonText}>Done Adding</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.voiceBottomNav}>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="home-outline" size={24} color="#999" />
              <Text style={styles.navItemText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="document-text-outline" size={24} color="#999" />
              <Text style={styles.navItemText}>Add Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="time-outline" size={24} color="#999" />
              <Text style={styles.navItemText}>Pendings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="person-outline" size={24} color="#999" />
              <Text style={styles.navItemText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Footer */}
      {!selectClientModalVisible && (
        <Footer activeTab="AddInvoice" navigation={navigation} />
      )}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    marginRight: 35,
  },
  menuButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
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
    padding: 15,
  },
  invoiceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  invoiceDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    padding: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  clientInfoText: {
    flex: 1,
  },
  clientPhone: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  clientPlaceholder: {
    fontSize: 12,
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
    color: '#E88E99',
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
    borderColor: '#E88E99',
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
    paddingVertical: 40,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptyItemsSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  addItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E88E99',
    borderRadius: 25,
    paddingVertical: 10,
    gap: 8,
  },
  voiceButton: {
    width: 50,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E88E99',
    borderRadius: 25,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Voice Modal Styles
  voiceModalContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  transcriptSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    minHeight: 80,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 20,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  microphoneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 138, 101, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleAnimated: {
    backgroundColor: 'rgba(255, 138, 101, 0.15)',
  },
  micCircle2: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 138, 101, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircle2Animated: {
    backgroundColor: 'rgba(255, 138, 101, 0.25)',
  },
  micCircle3: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 138, 101, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircle3Animated: {
    backgroundColor: 'rgba(255, 138, 101, 0.35)',
  },
  micInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8A65',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningText: {
    marginTop: 20,
    fontSize: 14,
    color: '#999',
  },
  recentlyAddedSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  recentlyAddedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  recentlyAddedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentlyAddedLeft: {
    flex: 1,
  },
  recentlyAddedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentlyAddedQuantity: {
    fontSize: 12,
    color: '#999',
  },
  recentlyAddedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  voiceActionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  doneAddingButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#FF8A65',
    alignItems: 'center',
  },
  doneAddingButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  voiceBottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navItem: {
    alignItems: 'center',
  },
  navItemText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalValue: {
    fontSize: 13,
    color: '#666',
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
    marginTop: 20,
    paddingVertical: 12,
    gap: 8,
  },
  addNewCardText: {
    fontSize: 14,
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
    backgroundColor: '#E88E99',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  generateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacing: {
    height: 20,
  }, 
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalScrollView: {
  },
  modalScrollContent: {
    paddingBottom: 30,
  },
  modalBody: {
    padding: 20,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyItemsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 20,
  },
  goToItemsButton: {
    backgroundColor: '#E88E99',
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
    marginBottom: 2,
  },
  selectableItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E88E99',
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
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderColor: '#E88E99',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  contactsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E88E99',
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
    backgroundColor: '#E88E99',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
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
  clientItemDetail: {
    fontSize: 12,
    color: '#888',
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