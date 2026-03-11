import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInvoices,
  getItems,
  getClients,
  getPayments,
  getPendingInvoices,
  getItemGroups,
  useNetworkStatus,
  getPendingSyncItems,
} from '../utils/NetworkManager';
import Footer from '../Components/Footer';
import SyncIndicator from '../Components/SyncIndicator';

interface ExportCenterScreenProps {
  navigation: any;
}

type ReportType = 'insights' | 'inventory' | 'tax' | 'outstanding';
type DateRangeType = 'preview' | 'week' | 'month' | 'custom';
type FormatType = 'pdf' | 'excel' | 'csv';

interface ReportData {
  type: string;
  invoices?: any[];
  payments?: any[];
  pending?: any[];
  items?: any[];
  startDate: string;
  endDate: string;
  customerName?: string;
  customerPhone?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: FormatType;
  day?: string; // e.g., "Monday" or "15th"
}

export default function ExportCenterScreen({ navigation }: ExportCenterScreenProps): React.JSX.Element {
  // Network status monitoring
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedReport, setSelectedReport] = useState<ReportType>('insights');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeType>('month');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('pdf');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleFrequency, setNewScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [newScheduleDay, setNewScheduleDay] = useState('Monday');

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
    updatePendingSyncCount();
    loadScheduledReports();
  }, []);

  const loadScheduledReports = async () => {
    try {
      const stored = await AsyncStorage.getItem('scheduled_reports');
      if (stored) {
        setScheduledReports(JSON.parse(stored));
      } else {
        // Add a default one for demonstration as per the image
        const defaultSchedules: ScheduledReport[] = [
          {
            id: '1',
            name: 'Weekly Sales Summary',
            type: 'insights',
            frequency: 'weekly',
            format: 'excel',
            day: 'Monday'
          }
        ];
        setScheduledReports(defaultSchedules);
        await AsyncStorage.setItem('scheduled_reports', JSON.stringify(defaultSchedules));
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
    }
  };

  const saveScheduledReport = async () => {
    if (!newScheduleName.trim()) {
      Alert.alert('Error', 'Please enter a name for the schedule');
      return;
    }

    const newSchedule: ScheduledReport = {
      id: Date.now().toString(),
      name: newScheduleName,
      type: selectedReport,
      frequency: newScheduleFrequency,
      format: selectedFormat,
      day: newScheduleFrequency === 'weekly' ? newScheduleDay : newScheduleFrequency === 'monthly' ? '1st' : undefined,
    };

    const updated = [...scheduledReports, newSchedule];
    setScheduledReports(updated);
    try {
      await AsyncStorage.setItem('scheduled_reports', JSON.stringify(updated));
      setShowScheduleModal(false);
      setNewScheduleName('');
      Toast.show({
        type: 'success',
        text1: 'Schedule Created',
        text2: 'Report has been scheduled successfully',
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const deleteScheduledReport = async (id: string) => {
    const updated = scheduledReports.filter(s => s.id !== id);
    setScheduledReports(updated);
    try {
      await AsyncStorage.setItem('scheduled_reports', JSON.stringify(updated));
      Toast.show({
        type: 'info',
        text1: 'Schedule Removed',
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  // Update pending sync count
  const updatePendingSyncCount = async () => {
    try {
      const pendingItems = await getPendingSyncItems();
      setPendingSyncCount(pendingItems.length);
    } catch (error) {
      console.error('Error getting pending sync count:', error);
    }
  };

  // Monitor network status changes
  useEffect(() => {
    if (isConnected && isInternetReachable) {
      // When back online, reload customers and update pending count
      // Check if there are pending items, if so, mark as syncing
      const checkAndSync = async () => {
        const pending = await getPendingSyncItems();
        if (pending.length > 0) {
          setIsSyncing(true);
          // Give some time for sync to complete
          setTimeout(() => {
            setIsSyncing(false);
            updatePendingSyncCount();
          }, 3000);
        }
      };

      checkAndSync();
      loadCustomers();
      updatePendingSyncCount();
    }
  }, [isConnected, isInternetReachable]);

  // Update date range when preset is selected
  useEffect(() => {
    const now = new Date();
    let start = new Date();

    switch (selectedDateRange) {
      case 'preview':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'custom':
        // Keep existing dates for custom
        return;
    }

    setStartDate(start);
    setEndDate(new Date());
  }, [selectedDateRange]);

  const loadCustomers = async () => {
    try {
      const clientsData = await getClients();
      setCustomers(clientsData);
    } catch (error) {
      console.error('Error loading customers:', error);
      // Don't show error to user - offline mode will work with cached data
    }
  };

  const reportTypes = [
    {
      id: 'insights' as ReportType,
      title: 'Insights',
      description: 'Sales, Payments, and trends',
      icon: 'analytics-outline',
      badge: false,
      locked: false,
    },
    {
      id: 'inventory' as ReportType,
      title: 'Inventory Report',
      description: 'Stock tracking and analysis',
      icon: 'cube-outline',
      badge: false,
      locked: false,
    },
    {
      id: 'tax' as ReportType,
      title: 'Tax Report',
      description: 'GST/VAT returns and summaries',
      icon: 'receipt-outline',
      badge: false,
      locked: false,
    },
    {
      id: 'outstanding' as ReportType,
      title: 'Customer Outstanding',
      description: 'Pending payments report',
      icon: 'cash-outline',
      badge: false,
      locked: false,
    },
  ];

  const formatOptions = [
    { id: 'pdf' as FormatType, icon: 'document-text', label: 'PDF', color: '#FF6B6B' },
    { id: 'excel' as FormatType, icon: 'grid', label: 'Excel', color: '#1D9B5F' },
    { id: 'csv' as FormatType, icon: 'list', label: 'CSV', color: '#4A90E2' },
  ];

  const handleReportSelect = (reportId: ReportType, locked: boolean) => {
    if (locked) {
      Alert.alert(
        'Premium Feature',
        'This report type is available in the premium version. Upgrade to unlock!',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedReport(reportId);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      setSelectedDateRange('custom');
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      setSelectedDateRange('custom');
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filterByDateRange = (items: any[], dateField: string = 'createdAt'): any[] => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.date || item.invoiceDate);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const generateReportData = async (): Promise<ReportData | null> => {
    try {
      setLoading(true);

      // Notify user if offline
      const isOffline = !isConnected || !isInternetReachable;
      if (isOffline) {
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Using locally cached data',
          position: 'bottom',
          visibilityTime: 2000,
        });
      }

      let reportData: ReportData = {
        type: '',
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
      };

      switch (selectedReport) {
        case 'insights':
          let invoices = await getInvoices();
          let payments = await getPayments();
          const filteredInvoices = filterByDateRange(invoices);
          const filteredPayments = filterByDateRange(payments);

          // Filter by customer if selected
          if (selectedCustomer) {
            invoices = filteredInvoices.filter(inv =>
              inv.clientCustomerId === selectedCustomer.id ||
              inv.clientCustomerId === selectedCustomer.serverId ||
              inv.clientPhone === selectedCustomer.phone ||
              inv.clientName === selectedCustomer.name
            );
            const invoiceIds = new Set(invoices.map(inv => inv.id || inv.serverId || inv.number || inv.invoiceNumber));
            payments = filteredPayments.filter(payment =>
              invoiceIds.has(payment.invoiceId) ||
              invoices.some(inv =>
                inv.number === payment.invoiceNumber ||
                inv.invoiceNumber === payment.invoiceNumber
              )
            );
          } else {
            invoices = filteredInvoices;
            payments = filteredPayments;
          }

          reportData = {
            ...reportData,
            type: 'Insights Report',
            invoices: invoices,
            payments: payments,
          };
          break;

        case 'tax':
          let taxInvoices = await getInvoices();
          const filteredTaxInvoices = filterByDateRange(taxInvoices);

          // Filter by customer if selected
          if (selectedCustomer) {
            taxInvoices = filteredTaxInvoices.filter(inv =>
              inv.clientCustomerId === selectedCustomer.id ||
              inv.clientCustomerId === selectedCustomer.serverId ||
              inv.clientPhone === selectedCustomer.phone ||
              inv.clientName === selectedCustomer.name
            );
          } else {
            taxInvoices = filteredTaxInvoices;
          }

          reportData = {
            ...reportData,
            type: 'Tax Report',
            invoices: taxInvoices,
          };
          break;

        case 'outstanding':
          let pendingPayments = await getPendingInvoices();

          // Filter by customer if selected
          if (selectedCustomer) {
            pendingPayments = pendingPayments.filter(payment =>
              payment.clientCustomerId === selectedCustomer.id ||
              payment.clientCustomerId === selectedCustomer.serverId ||
              payment.clientPhone === selectedCustomer.phone ||
              payment.clientName === selectedCustomer.name ||
              payment.clientCustomerName === selectedCustomer.name
            );
          }

          reportData = {
            ...reportData,
            type: 'Customer Outstanding Report',
            pending: pendingPayments,
          };
          break;

        case 'inventory':
          const items = await getItems();
          const groups = await getItemGroups();

          // Create a map of groupId to groupName for quick lookup
          const groupMap = new Map<string, string>();
          groups.forEach(group => {
            groupMap.set(group.id || group._id || '', group.name);
          });

          // Populate groupName for items that have groupId but no groupName
          const enrichedItems = items.map(item => {
            if (item.groupId && !item.groupName && groupMap.has(item.groupId)) {
              return { ...item, groupName: groupMap.get(item.groupId) };
            }
            return item;
          });

          reportData = {
            ...reportData,
            type: 'Inventory Report',
            items: enrichedItems,
          };
          break;
      }

      setLoading(false);
      return reportData;
    } catch (error) {
      console.error('Error generating report data:', error);
      setLoading(false);
      return null;
    }
  };

  const getUniqueCustomerCount = (items: any[]): number => {
    const uniqueCustomers = new Set<string>();
    items.forEach(item => {
      const customerId = item.clientCustomerId || item.clientCustomerPhone || item.clientPhone || item.clientName || item.clientCustomerName;
      if (customerId) {
        uniqueCustomers.add(String(customerId));
      }
    });
    return uniqueCustomers.size;
  };

  const formatDataAsCSV = (data: ReportData): string => {
    let csv = '';

    // Add offline mode indicator if applicable
    const isOffline = !isConnected || !isInternetReachable;
    if (isOffline) {
      csv += `GENERATED IN OFFLINE MODE\n`;
      csv += `Data Source: Local Cache\n`;
      csv += `\n`;
    }

    // Add customer-specific header if filtering by customer
    if (data.customerName) {
      csv += `Customer Report\n`;
      csv += `Customer Name,${data.customerName}\n`;
      csv += `Phone,${data.customerPhone || 'N/A'}\n`;
      csv += `Report Period,${data.startDate} - ${data.endDate}\n`;
      csv += `Generated On,${new Date().toLocaleDateString()}\n`;
      csv += `\n`;
    }

    if (data.type === 'Insights Report' && data.invoices) {
      csv = 'Date,Invoice Number,Customer,Customer Phone,Amount,Paid,Pending,Status\n';
      data.invoices.forEach((invoice: any) => {
        const amount = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
        const paid = invoice.paidAmount || 0;
        const pending = amount - paid;
        csv += `${formatDate(new Date(invoice.createdAt || invoice.date))},`;
        csv += `${invoice.number || invoice.invoiceNumber},`;
        csv += `"${invoice.clientName || invoice.clientInfo?.name || 'N/A'}",`;
        csv += `${invoice.clientPhone || invoice.clientInfo?.phone || 'N/A'},`;
        csv += `${amount.toFixed(2)},${paid.toFixed(2)},${pending.toFixed(2)},`;
        csv += `${invoice.status || 'pending'}\n`;
      });

      // Add summary with unique customer count
      const uniqueCustomerCount = getUniqueCustomerCount(data.invoices);
      const totalRevenue = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      const totalPaid = data.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      csv += `\nSummary\n`;
      csv += `Total Invoices,${data.invoices.length}\n`;
      csv += `Unique Customers,${uniqueCustomerCount}\n`;
      csv += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
      csv += `Total Paid,${totalPaid.toFixed(2)}\n`;
      csv += `Total Pending,${(totalRevenue - totalPaid).toFixed(2)}\n`;

    } else if (data.type === 'Tax Report' && data.invoices) {
      csv = 'Date,Invoice Number,Customer,Subtotal,Tax Amount,Discount,Total\n';
      data.invoices.forEach((invoice: any) => {
        const subtotal = invoice.subTotal || invoice.subtotal || 0;
        const tax = invoice.tax || invoice.totalTax || 0;
        const discount = invoice.discount || invoice.totalDiscount || 0;
        const total = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
        csv += `${formatDate(new Date(invoice.createdAt || invoice.date))},`;
        csv += `${invoice.number || invoice.invoiceNumber},`;
        csv += `"${invoice.clientName || invoice.clientInfo?.name || 'N/A'}",`;
        csv += `${subtotal.toFixed(2)},${tax.toFixed(2)},${discount.toFixed(2)},${total.toFixed(2)}\n`;
      });

      // Add tax summary
      const totalTax = data.invoices.reduce((sum, inv) => sum + (inv.tax || inv.totalTax || 0), 0);
      const totalAmount = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      csv += `\nTax Summary\n`;
      csv += `Total Invoices,${data.invoices.length}\n`;
      csv += `Total Tax Collected,${totalTax.toFixed(2)}\n`;
      csv += `Total Amount,${totalAmount.toFixed(2)}\n`;

    } else if (data.type === 'Customer Outstanding Report' && data.pending) {
      // CSV Headers - exclude customer info if filtering by specific customer
      if (data.customerName) {
        csv = 'Invoice Number,Invoice Date,Amount Due,Total Amount,Paid Amount,Due Date\n';
        data.pending.forEach((pending: any) => {
          csv += `${pending.invoiceNumber},`;
          csv += `${formatDate(new Date(pending.invoiceDate || pending.createdAt || pending.date))},`;
          csv += `${(pending.pendingAmount || pending.amount || 0).toFixed(2)},`;
          csv += `${(pending.totalAmount || 0).toFixed(2)},`;
          csv += `${(pending.paidAmount || 0).toFixed(2)},`;
          csv += `${pending.dueDate || 'N/A'}\n`;
        });
      } else {
        csv = 'Customer Name,Phone,Amount Due,Total Amount,Paid Amount,Invoice Number,Invoice Date,Due Date\n';
        data.pending.forEach((pending: any) => {
          csv += `"${pending.clientCustomerName || pending.clientName || 'N/A'}",`;
          csv += `${pending.clientCustomerPhone || pending.clientPhone || 'N/A'},`;
          csv += `${(pending.pendingAmount || pending.amount || 0).toFixed(2)},`;
          csv += `${(pending.totalAmount || 0).toFixed(2)},`;
          csv += `${(pending.paidAmount || 0).toFixed(2)},`;
          csv += `${pending.invoiceNumber},`;
          csv += `${formatDate(new Date(pending.invoiceDate || pending.createdAt || pending.date))},`;
          csv += `${pending.dueDate || 'N/A'}\n`;
        });
      }

      // Add summary with unique customer count
      const uniqueCustomerCount = getUniqueCustomerCount(data.pending);
      const totalOutstanding = data.pending.reduce((sum, p) => sum + (p.pendingAmount || p.amount || 0), 0);
      csv += `\nSummary\n`;
      csv += `Total Invoices,${data.pending.length}\n`;
      if (!data.customerName) {
        csv += `Unique Customers,${uniqueCustomerCount}\n`;
      }
      csv += `Total Outstanding,${totalOutstanding.toFixed(2)}\n`;

    } else if (data.type === 'Inventory Report' && data.items) {
      csv = 'Item Name,SKU,Quantity,Price,Tax,Unit,Group,Description\n';
      data.items.forEach((item: any) => {
        csv += `"${item.name || item.itemName || 'N/A'}",`;
        csv += `${item.sku || item.code || 'N/A'},`;
        csv += `${item.quantity || item.stockAvailable || item.stock || 0},`;
        csv += `${(item.price || item.amount || item.sellingPrice || 0).toFixed(2)},`;
        csv += `${item.tax || 0}%,`;
        csv += `${item.unit || 'pcs'},`;
        csv += `"${item.groupName || 'Ungrouped'}",`;
        csv += `"${(item.description || '').replace(/"/g, '""')}"\n`;
      });

      // Add summary
      const totalValue = data.items.reduce((sum, item) => sum + ((item.quantity || item.stockAvailable || 0) * (item.price || item.sellingPrice || 0)), 0);
      csv += `\nSummary\n`;
      csv += `Total Items,${data.items.length}\n`;
      csv += `Total Inventory Value,${totalValue.toFixed(2)}\n`;
    }

    return csv;
  };

  const getExcelSheetData = (data: ReportData): { sheetName: string; rows: Array<Array<string | number>> } => {
    const rows: Array<Array<string | number>> = [];
    const isOffline = !isConnected || !isInternetReachable;

    if (isOffline) {
      rows.push(['GENERATED IN OFFLINE MODE']);
      rows.push(['Data Source', 'Local Cache']);
      rows.push([]);
    }

    if (data.customerName) {
      rows.push(['Customer Report']);
      rows.push(['Customer Name', data.customerName]);
      rows.push(['Phone', data.customerPhone || 'N/A']);
      rows.push(['Report Period', `${data.startDate} - ${data.endDate}`]);
      rows.push(['Generated On', new Date().toLocaleDateString()]);
      rows.push([]);
    }

    if (data.type === 'Insights Report' && data.invoices) {
      rows.push(['Date', 'Invoice Number', 'Customer', 'Customer Phone', 'Amount', 'Paid', 'Pending', 'Status']);
      data.invoices.forEach((invoice: any) => {
        const amount = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
        const paid = invoice.paidAmount || 0;
        const pending = amount - paid;

        rows.push([
          formatDate(new Date(invoice.createdAt || invoice.date)),
          invoice.number || invoice.invoiceNumber || 'N/A',
          invoice.clientName || invoice.clientInfo?.name || 'N/A',
          invoice.clientPhone || invoice.clientInfo?.phone || 'N/A',
          amount,
          paid,
          pending,
          invoice.status || 'pending',
        ]);
      });

      const uniqueCustomerCount = getUniqueCustomerCount(data.invoices);
      const totalRevenue = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      const totalPaid = data.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Total Invoices', data.invoices.length]);
      rows.push(['Unique Customers', uniqueCustomerCount]);
      rows.push(['Total Revenue', totalRevenue]);
      rows.push(['Total Paid', totalPaid]);
      rows.push(['Total Pending', totalRevenue - totalPaid]);

      return { sheetName: 'Insights', rows };
    }

    if (data.type === 'Tax Report' && data.invoices) {
      rows.push(['Date', 'Invoice Number', 'Customer', 'Subtotal', 'Tax Amount', 'Discount', 'Total']);
      data.invoices.forEach((invoice: any) => {
        const subtotal = invoice.subTotal || invoice.subtotal || 0;
        const tax = invoice.tax || invoice.totalTax || 0;
        const discount = invoice.discount || invoice.totalDiscount || 0;
        const total = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;

        rows.push([
          formatDate(new Date(invoice.createdAt || invoice.date)),
          invoice.number || invoice.invoiceNumber || 'N/A',
          invoice.clientName || invoice.clientInfo?.name || 'N/A',
          subtotal,
          tax,
          discount,
          total,
        ]);
      });

      const totalTax = data.invoices.reduce((sum, inv) => sum + (inv.tax || inv.totalTax || 0), 0);
      const totalAmount = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      rows.push([]);
      rows.push(['Tax Summary']);
      rows.push(['Total Invoices', data.invoices.length]);
      rows.push(['Total Tax Collected', totalTax]);
      rows.push(['Total Amount', totalAmount]);

      return { sheetName: 'Tax Report', rows };
    }

    if (data.type === 'Customer Outstanding Report' && data.pending) {
      if (data.customerName) {
        rows.push(['Invoice Number', 'Invoice Date', 'Amount Due', 'Total Amount', 'Paid Amount', 'Due Date']);
        data.pending.forEach((pending: any) => {
          rows.push([
            pending.invoiceNumber || 'N/A',
            formatDate(new Date(pending.invoiceDate || pending.createdAt || pending.date)),
            pending.pendingAmount || pending.amount || 0,
            pending.totalAmount || 0,
            pending.paidAmount || 0,
            pending.dueDate || 'N/A',
          ]);
        });
      } else {
        rows.push(['Customer Name', 'Phone', 'Amount Due', 'Total Amount', 'Paid Amount', 'Invoice Number', 'Invoice Date', 'Due Date']);
        data.pending.forEach((pending: any) => {
          rows.push([
            pending.clientCustomerName || pending.clientName || 'N/A',
            pending.clientCustomerPhone || pending.clientPhone || 'N/A',
            pending.pendingAmount || pending.amount || 0,
            pending.totalAmount || 0,
            pending.paidAmount || 0,
            pending.invoiceNumber || 'N/A',
            formatDate(new Date(pending.invoiceDate || pending.createdAt || pending.date)),
            pending.dueDate || 'N/A',
          ]);
        });
      }

      const uniqueCustomerCount = getUniqueCustomerCount(data.pending);
      const totalOutstanding = data.pending.reduce((sum, p) => sum + (p.pendingAmount || p.amount || 0), 0);
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Total Invoices', data.pending.length]);
      if (!data.customerName) {
        rows.push(['Unique Customers', uniqueCustomerCount]);
      }
      rows.push(['Total Outstanding', totalOutstanding]);

      return { sheetName: 'Outstanding', rows };
    }

    if (data.type === 'Inventory Report' && data.items) {
      rows.push(['Item Name', 'SKU', 'Quantity', 'Price', 'Tax', 'Unit', 'Group', 'Description']);
      data.items.forEach((item: any) => {
        rows.push([
          item.name || item.itemName || 'N/A',
          item.sku || item.code || 'N/A',
          item.quantity || item.stockAvailable || item.stock || 0,
          item.price || item.amount || item.sellingPrice || 0,
          `${item.tax || 0}%`,
          item.unit || 'pcs',
          item.groupName || 'Ungrouped',
          item.description || '',
        ]);
      });

      const totalValue = data.items.reduce((sum, item) => sum + ((item.quantity || item.stockAvailable || item.stock || 0) * (item.price || item.amount || item.sellingPrice || 0)), 0);
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Total Items', data.items.length]);
      rows.push(['Total Inventory Value', totalValue]);

      return { sheetName: 'Inventory', rows };
    }

    return { sheetName: 'Report', rows };
  };

  const escapeExcelXml = (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDataAsExcel = (data: ReportData): string => {
    const { sheetName, rows } = getExcelSheetData(data);
    const safeSheetName = sheetName.replace(/[\\/:?*\[\]]/g, '').slice(0, 31) || 'Report';

    const tableRows = rows
      .map((row, rowIndex) => {
        const isHeaderRow = (rowIndex === 0 || rows[rowIndex - 1]?.length === 0) && row.some(cell => cell !== '');
        const cells = row.length === 0
          ? '<Cell><Data ss:Type="String"></Data></Cell>'
          : row.map((cell) => {
            const isNumber = typeof cell === 'number' && Number.isFinite(cell);
            const styleId = isHeaderRow ? 'Header' : isNumber ? 'Number' : 'Default';
            const type = isNumber ? 'Number' : 'String';
            const value = isNumber ? String(cell) : escapeExcelXml(String(cell));
            return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${value}</Data></Cell>`;
          }).join('');

        return `<Row>${cells}</Row>`;
      })
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1D9B5F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Number">
   <NumberFormat ss:Format="Standard"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeExcelXml(safeSheetName)}">
  <Table>
   ${tableRows}
  </Table>
 </Worksheet>
</Workbook>`;
  };

  const generatePDFHTML = (data: ReportData): string => {
    const isOffline = !isConnected || !isInternetReachable;
    let html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #FF8A5B; padding-bottom: 15px; }
            .header h1 { color: #FF8A5B; margin: 0; font-size: 28px; }
            .header .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .offline-badge { background: #FFF4ED; color: #FF8A5B; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: 600; margin-top: 8px; border: 1px solid #FFE0CC; }
            .date-range { text-align: center; background: #F5F5F5; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
            .summary-box { background: #FF8A5B10; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #FF8A5B; }
            .summary-box h3 { margin: 0 0 10px 0; color: #FF8A5B; }
            .summary-item { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #FF8A5B; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #E0E0E0; font-size: 11px; }
            tr:nth-child(even) { background: #F9F9F9; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #E0E0E0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.type}</h1>
            ${isOffline ? '<div class="offline-badge">📴 Generated Offline - Using Cached Data</div>' : ''}
            ${data.customerName ? `<div class="subtitle" style="color: #FF8A5B; font-size: 16px; font-weight: 600; margin-top: 8px;">Customer: ${data.customerName}${data.customerPhone ? ' | ' + data.customerPhone : ''}</div>` : ''}
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div class="date-range">
            <strong>Report Period:</strong> ${data.startDate} - ${data.endDate}
          </div>
    `;

    if (data.type === 'Insights Report' && data.invoices) {
      const uniqueCustomerCount = getUniqueCustomerCount(data.invoices);
      const totalRevenue = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      const totalPaid = data.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalPending = totalRevenue - totalPaid;

      html += `
        <div class="summary-box">
          <h3>Summary</h3>
          <div class="summary-item"><span class="summary-label">Total Invoices:</span><span>${data.invoices.length}</span></div>
          <div class="summary-item"><span class="summary-label">Unique Customers:</span><span>${uniqueCustomerCount}</span></div>
          <div class="summary-item"><span class="summary-label">Total Revenue:</span><span>₹${totalRevenue.toFixed(2)}</span></div>
          <div class="summary-item"><span class="summary-label">Total Paid:</span><span>₹${totalPaid.toFixed(2)}</span></div>
          <div class="summary-item"><span class="summary-label">Total Pending:</span><span>₹${totalPending.toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              ${data.customerName ? '' : '<th>Customer</th>'}
              <th class="text-right">Amount</th>
              <th class="text-right">Paid</th>
              <th class="text-right">Pending</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.invoices.forEach(invoice => {
        const amount = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
        const paid = invoice.paidAmount || 0;
        const pending = amount - paid;
        html += `
          <tr>
            <td>${formatDate(new Date(invoice.createdAt || invoice.date))}</td>
            <td>${invoice.number || invoice.invoiceNumber}</td>
            ${data.customerName ? '' : `<td>${invoice.clientName || invoice.clientInfo?.name || 'N/A'}</td>`}
            <td class="text-right">₹${amount.toFixed(2)}</td>
            <td class="text-right">₹${paid.toFixed(2)}</td>
            <td class="text-right">₹${pending.toFixed(2)}</td>
            <td class="text-center">${invoice.status || 'pending'}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;

    } else if (data.type === 'Tax Report' && data.invoices) {
      const totalTax = data.invoices.reduce((sum, inv) => sum + (inv.tax || inv.totalTax || 0), 0);
      const totalAmount = data.invoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || inv.grandTotal || 0), 0);
      const totalSubtotal = data.invoices.reduce((sum, inv) => sum + (inv.subTotal || inv.subtotal || 0), 0);

      html += `
        <div class="summary-box">
          <h3>Tax Summary</h3>
          <div class="summary-item"><span class="summary-label">Total Invoices:</span><span>${data.invoices.length}</span></div>
          <div class="summary-item"><span class="summary-label">Total Subtotal:</span><span>₹${totalSubtotal.toFixed(2)}</span></div>
          <div class="summary-item"><span class="summary-label">Total Tax Collected:</span><span>₹${totalTax.toFixed(2)}</span></div>
          <div class="summary-item"><span class="summary-label">Total Amount:</span><span>₹${totalAmount.toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              ${data.customerName ? '' : '<th>Customer</th>'}
              <th class="text-right">Subtotal</th>
              <th class="text-right">Tax</th>
              <th class="text-right">Discount</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.invoices.forEach(invoice => {
        const subtotal = invoice.subTotal || invoice.subtotal || 0;
        const tax = invoice.tax || invoice.totalTax || 0;
        const discount = invoice.discount || invoice.totalDiscount || 0;
        const total = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
        html += `
          <tr>
            <td>${formatDate(new Date(invoice.createdAt || invoice.date))}</td>
            <td>${invoice.number || invoice.invoiceNumber}</td>
            ${data.customerName ? '' : `<td>${invoice.clientName || invoice.clientInfo?.name || 'N/A'}</td>`}
            <td class="text-right">₹${subtotal.toFixed(2)}</td>
            <td class="text-right">₹${tax.toFixed(2)}</td>
            <td class="text-right">₹${discount.toFixed(2)}</td>
            <td class="text-right">₹${total.toFixed(2)}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;

    } else if (data.type === 'Customer Outstanding Report' && data.pending) {
      const uniqueCustomerCount = getUniqueCustomerCount(data.pending);
      const totalOutstanding = data.pending.reduce((sum, p) => sum + (p.pendingAmount || p.amount || 0), 0);
      const totalAmount = data.pending.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      html += `
        <div class="summary-box">
          <h3>Outstanding Summary</h3>
          <div class="summary-item"><span class="summary-label">Total Invoices:</span><span>${data.pending.length}</span></div>
          ${data.customerName ? '' : `<div class="summary-item"><span class="summary-label">Unique Customers:</span><span>${uniqueCustomerCount}</span></div>`}
          <div class="summary-item"><span class="summary-label">Total Invoice Amount:</span><span>₹${totalAmount.toFixed(2)}</span></div>
          <div class="summary-item"><span class="summary-label">Total Outstanding:</span><span>₹${totalOutstanding.toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              ${data.customerName ? '' : '<th>Customer</th><th>Phone</th>'}
              <th>Invoice #</th>
              <th class="text-right">Total</th>
              <th class="text-right">Paid</th>
              <th class="text-right">Pending</th>
              <th>Invoice Date</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.pending.forEach(pending => {
        html += `
          <tr>
            ${data.customerName ? '' : `
              <td>${pending.clientCustomerName || pending.clientName || 'N/A'}</td>
              <td>${pending.clientCustomerPhone || pending.clientPhone || 'N/A'}</td>
            `}
            <td>${pending.invoiceNumber}</td>
            <td class="text-right">₹${(pending.totalAmount || 0).toFixed(2)}</td>
            <td class="text-right">₹${(pending.paidAmount || 0).toFixed(2)}</td>
            <td class="text-right">₹${(pending.pendingAmount || pending.amount || 0).toFixed(2)}</td>
            <td>${formatDate(new Date(pending.invoiceDate || pending.createdAt || pending.date))}</td>
            <td>${pending.dueDate || 'N/A'}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;

    } else if (data.type === 'Inventory Report' && data.items) {
      const totalValue = data.items.reduce((sum, item) => sum + ((item.quantity || item.stockAvailable || item.stock || 0) * (item.price || item.amount || item.sellingPrice || 0)), 0);

      html += `
        <div class="summary-box">
          <h3>Inventory Summary</h3>
          <div class="summary-item"><span class="summary-label">Total Items:</span><span>${data.items.length}</span></div>
          <div class="summary-item"><span class="summary-label">Total Inventory Value:</span><span>₹${totalValue.toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>SKU</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Price</th>
              <th class="text-center">Tax</th>
              <th class="text-right">Value</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.items.forEach(item => {
        const qty = item.quantity || item.stockAvailable || item.stock || 0;
        const price = item.price || item.amount || item.sellingPrice || 0;
        const value = qty * price;
        html += `
          <tr>
            <td>${item.name || item.itemName || 'N/A'}</td>
            <td>${item.sku || item.code || 'N/A'}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">₹${price.toFixed(2)}</td>
            <td class="text-center">${item.tax || 0}%</td>
            <td class="text-right">₹${value.toFixed(2)}</td>
            <td>${item.groupName || 'Ungrouped'}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
    }

    html += `
          <div class="footer">
            <p>Generated by Viveha.ai Export Center</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  const handlePreviewReport = async () => {
    setLoading(true);
    try {
      const isOffline = !isConnected || !isInternetReachable;
      if (isOffline) {
        Toast.show({
          type: 'info',
          text1: 'Preview (Offline)',
          text2: 'Showing cached data',
          position: 'bottom',
          visibilityTime: 2000,
        });
      }

      const data = await generateReportData();
      if (data) {
        setPreviewData(data);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      Toast.show({
        type: 'error',
        text1: 'Preview Failed',
        text2: 'Could not load preview data',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (isGenerating || loading) return;

    setIsGenerating(true);

    try {
      // Notify user about the mode
      const isOffline = !isConnected || !isInternetReachable;
      Toast.show({
        type: 'info',
        text1: isOffline ? 'Generating Report (Offline)' : 'Generating Report',
        text2: isOffline ? 'Using cached data...' : 'Please wait...',
        position: 'bottom',
      });

      // Get report data
      const reportData = await generateReportData();

      if (!reportData) {
        Alert.alert('Error', 'Failed to generate report data');
        setIsGenerating(false);
        return;
      }

      // Check if there's data to export
      const hasData =
        (reportData.invoices && reportData.invoices.length > 0) ||
        (reportData.payments && reportData.payments.length > 0) ||
        (reportData.pending && reportData.pending.length > 0) ||
        (reportData.items && reportData.items.length > 0);

      if (!hasData) {
        Alert.alert(
          'No Data',
          'There is no data available for this report in the selected date range. Please try a different date range or add some data first.',
          [{ text: 'OK' }]
        );
        setIsGenerating(false);
        return;
      }

      // Generate filename
      const timestamp = new Date().getTime();
      const reportName = selectedReport.replace(/\s+/g, '_');
      const customerStr = selectedCustomer ? `_${selectedCustomer.name.replace(/\s+/g, '_')}` : '';
      const dateStr = `${formatDate(startDate).replace(/[, ]/g, '_')}_to_${formatDate(endDate).replace(/[, ]/g, '_')}`;

      if (selectedFormat === 'pdf') {
        // Generate PDF
        const html = generatePDFHTML(reportData);
        const { uri } = await Print.printToFileAsync({ html });

        // Rename file to include report info
        const fileName = `${reportName}${customerStr}_${dateStr}.pdf`;
        const newUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Report',
          });
        }

        const isOffline = !isConnected || !isInternetReachable;
        Toast.show({
          type: 'success',
          text1: isOffline ? 'PDF Generated (Offline)' : 'PDF Generated',
          text2: isOffline ? 'Report created from cached data' : 'Report generated successfully!',
          position: 'bottom',
          visibilityTime: 3000,
        });

      } else if (selectedFormat === 'excel') {
        const excelContent = formatDataAsExcel(reportData);
        const fileName = `${reportName}${customerStr}_${dateStr}.xls`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, excelContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.ms-excel',
            dialogTitle: 'Export Report',
            UTI: 'com.microsoft.excel.xls',
          });
        }

        const isOffline = !isConnected || !isInternetReachable;
        Toast.show({
          type: 'success',
          text1: isOffline ? 'Excel Generated (Offline)' : 'Excel Generated',
          text2: isOffline ? 'Report created from cached data' : 'Report generated successfully!',
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else if (selectedFormat === 'csv') {
        // Generate CSV
        const csvContent = formatDataAsCSV(reportData);
        const fileName = `${reportName}${customerStr}_${dateStr}.csv`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        // Write file
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Report',
          });
        }

        const isOffline = !isConnected || !isInternetReachable;
        Toast.show({
          type: 'success',
          text1: isOffline ? 'CSV Generated (Offline)' : 'CSV Generated',
          text2: isOffline ? 'Report created from cached data' : 'Report generated successfully!',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }

    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        'Failed to generate report. Please try again.',
        [{ text: 'OK' }]
      );
      Toast.show({
        type: 'error',
        text1: 'Generation Failed',
        text2: 'Please try again',
        position: 'bottom',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Center</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Sync Indicator */}
      <SyncIndicator
        isSyncing={isSyncing}
        isOnline={isConnected && isInternetReachable}
        pendingCount={pendingSyncCount}
      />

      {/* Offline Indicator Banner */}
      {(!isConnected || !isInternetReachable) && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FF8A5B" />
          <Text style={styles.offlineBannerText}>
            Offline Mode - Reports will use cached data
          </Text>
        </View>
      )}

      {/* Pending Sync Banner */}
      {pendingSyncCount > 0 && isConnected && isInternetReachable && (
        <View style={styles.pendingSyncBanner}>
          <Ionicons name="cloud-upload-outline" size={16} color="#4A90E2" />
          <Text style={styles.pendingSyncBannerText}>
            {pendingSyncCount} item{pendingSyncCount !== 1 ? 's' : ''} syncing with server...
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Report Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPORT TYPE</Text>
          <View style={styles.reportTypeContainer}>
            {reportTypes.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportTypeItem}
                onPress={() => handleReportSelect(report.id, report.locked)}
              >
                <View style={styles.reportLeft}>
                  <View style={styles.reportIconContainer}>
                    <Ionicons name={report.icon as any} size={18} color="#666" />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>{report.title}</Text>
                    <Text style={styles.reportDescription}>{report.description}</Text>
                  </View>
                </View>
                {report.locked ? (
                  <Ionicons name="lock-closed" size={18} color="#999" />
                ) : (
                  <View style={[
                    styles.radioButton,
                    selectedReport === report.id && styles.radioButtonSelected
                  ]}>
                    {selectedReport === report.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA RANGE</Text>
          <View style={styles.dataRangeContainer}>
            <View style={styles.dateRangeTabs}>
              {(['preview', 'week', 'month', 'custom'] as DateRangeType[]).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.dateRangeTab,
                    selectedDateRange === range && styles.dateRangeTabActive
                  ]}
                  onPress={() => setSelectedDateRange(range)}
                >
                  <Text style={[
                    styles.dateRangeTabText,
                    selectedDateRange === range && styles.dateRangeTabTextActive
                  ]}>
                    {range === 'preview' ? 'Last 7d' : range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateDisplay}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onStartDateChange}
                maximumDate={endDate}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onEndDateChange}
                minimumDate={startDate}
                maximumDate={new Date()}
              />
            )}
          </View>
        </View>

        {/* Customer Filter Section */}
        {(selectedReport === 'insights' || selectedReport === 'outstanding' || selectedReport === 'tax') && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CUSTOMER FILTER (Optional)</Text>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerSelector(true)}
            >
              <View style={styles.customerSelectorLeft}>
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={styles.customerSelectorText}>
                  {selectedCustomer ? selectedCustomer.name : 'All Customers'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
            {selectedCustomer && (
              <TouchableOpacity
                style={styles.clearCustomerButton}
                onPress={() => setSelectedCustomer(null)}
              >
                <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                <Text style={styles.clearCustomerText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Format Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FORMAT OPTIONS</Text>
          <View style={styles.formatOptionsContainer}>
            {formatOptions.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatOption,
                  selectedFormat === format.id && styles.formatOptionActive
                ]}
                onPress={() => setSelectedFormat(format.id)}
              >
                <View style={[styles.formatIconContainer, { backgroundColor: format.color + '20' }]}>
                  <Ionicons name={format.icon as any} size={22} color={format.color} />
                </View>
                <Text style={styles.formatLabel}>{format.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
                  {/* Scheduled Reports Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>SCHEDULED REPORTS</Text>
            <TouchableOpacity 
              style={styles.createNewButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Ionicons name="add-circle" size={14} color="#4A90E2" />
              <Text style={styles.createNewText}>Create New</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.scheduledReportsContainer}>
            {scheduledReports.map((report) => (
              <View key={report.id} style={styles.scheduledReportItem}>
                <View style={styles.scheduledItemLeft}>
                  <View style={styles.clockIconContainer}>
                    <Ionicons name="time" size={18} color="#666" />
                  </View>
                  <View style={styles.scheduledItemInfo}>
                    <Text style={styles.scheduledItemTitle}>{report.name}</Text>
                    <Text style={styles.scheduledItemSubtitle}>
                      Every {report.day || report.frequency} | {report.format.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => {
                    Alert.alert(
                      'Manage Schedule',
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteScheduledReport(report.id) }
                      ]
                    );
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            ))}
            
            {scheduledReports.length === 0 && (
              <View style={styles.emptySchedules}>
                <Text style={styles.emptySchedulesText}>No reports scheduled yet</Text>
              </View>
            )}
          </View>
          <Text style={styles.historyHelpText}>
            Files are stored for 30 days in the Export History
          </Text>
        </View>

        {/* Generate Report Button */}
        <TouchableOpacity
          style={[styles.generateButton, (isGenerating || loading) && styles.generateButtonDisabled]}
          onPress={handleGenerateReport}
          disabled={isGenerating || loading}
        >
          {isGenerating || loading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.generateButtonText}>
                {loading ? 'Loading Data...' : 'Generating...'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Reports are generated in {selectedFormat.toUpperCase()} format for the selected date range.
          {(!isConnected || !isInternetReachable) ? '\n📴 Working offline - using cached data.' : '\n All reports are automatically synced.'}
        </Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Customer Selector Modal */}
      <Modal
        visible={showCustomerSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerSelector(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.customerItem, !selectedCustomer && styles.customerItemSelected]}
              onPress={() => {
                setSelectedCustomer(null);
                setShowCustomerSelector(false);
              }}
            >
              <Ionicons name="people-outline" size={20} color="#4A90E2" />
              <Text style={styles.customerItemText}>All Customers</Text>
              {!selectedCustomer && (
                <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
              )}
            </TouchableOpacity>

            <FlatList
              data={customers}
              keyExtractor={(item) => item.id || item.serverId || item.phone}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    selectedCustomer?.id === item.id && styles.customerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerSelector(false);
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#666" />
                  <View style={styles.customerItemInfo}>
                    <Text style={styles.customerItemText}>{item.name}</Text>
                    <Text style={styles.customerItemPhone}>{item.phone}</Text>
                  </View>
                  {selectedCustomer?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No customers found</Text>
                </View>
              )}
              style={styles.customerList}
            />
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preview Report</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.previewLoadingContainer}>
                <ActivityIndicator size="large" color="#FF8A5B" />
                <Text style={styles.previewLoadingText}>Loading preview...</Text>
              </View>
            ) : previewData ? (
              <>
                <ScrollView
                  style={styles.previewScrollView}
                  contentContainerStyle={styles.previewScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>{previewData.type}</Text>
                    {(!isConnected || !isInternetReachable) && (
                      <View style={styles.offlineIndicator}>
                        <Ionicons name="cloud-offline" size={12} color="#FF8A5B" />
                        <Text style={styles.offlineIndicatorText}>
                          Offline Mode - Using Cached Data
                        </Text>
                      </View>
                    )}
                    <Text style={styles.previewDateRange}>
                      {previewData.startDate} - {previewData.endDate}
                    </Text>
                    {selectedCustomer && (
                      <Text style={styles.previewCustomer}>
                        Customer: {selectedCustomer.name}
                      </Text>
                    )}
                  </View>

                  {/* Check if there's any data to show */}
                  {!previewData.invoices?.length &&
                    !previewData.pending?.length &&
                    !previewData.items?.length &&
                    !previewData.payments?.length && (
                      <View style={styles.previewEmptyState}>
                        <Ionicons name="document-outline" size={52} color="#CCC" />
                        <Text style={styles.previewEmptyTitle}>No Data Available</Text>
                        <Text style={styles.previewEmptyText}>
                          There is no data for this report in the selected date range.
                        </Text>
                      </View>
                    )}

                  {previewData.invoices && previewData.invoices.length > 0 && (
                    <View style={styles.previewSection}>
                      <View style={styles.previewSectionHeader}>
                        <Ionicons name="receipt-outline" size={18} color="#FF8A5B" />
                        <Text style={styles.previewSectionTitle}>
                          Invoices ({previewData.invoices.length})
                        </Text>
                      </View>
                      {previewData.invoices.slice(0, 10).map((inv: any, index: number) => (
                        <View key={index} style={styles.previewItem}>
                          <View style={styles.previewItemHeader}>
                            <Text style={styles.previewItemTitle}>
                              #{inv.invoiceNumber || inv.number || `${index + 1}`}
                            </Text>
                            <Text style={styles.previewItemAmount}>
                              ₹{(inv.total || inv.totalAmount || inv.grandTotal || 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.previewItemDetail}>
                            {inv.clientName || inv.clientCustomerName || 'N/A'}
                          </Text>
                        </View>
                      ))}
                      {previewData.invoices.length > 10 && (
                        <Text style={styles.previewMore}>
                          + {previewData.invoices.length - 10} more invoices
                        </Text>
                      )}
                    </View>
                  )}

                  {previewData.pending && previewData.pending.length > 0 && (
                    <View style={styles.previewSection}>
                      <View style={styles.previewSectionHeader}>
                        <Ionicons name="time-outline" size={18} color="#FF8A5B" />
                        <Text style={styles.previewSectionTitle}>
                          Pending Payments ({previewData.pending.length})
                        </Text>
                      </View>
                      {previewData.pending.slice(0, 10).map((pend: any, index: number) => (
                        <View key={index} style={styles.previewItem}>
                          <View style={styles.previewItemHeader}>
                            <Text style={styles.previewItemTitle}>
                              {pend.clientName || pend.clientCustomerName || 'N/A'}
                            </Text>
                            <Text style={[styles.previewItemAmount, styles.previewAmountPending]}>
                              ₹{(pend.pendingAmount || pend.amount || 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.previewItemDetail}>
                            Invoice: {pend.invoiceNumber || 'N/A'}
                          </Text>
                        </View>
                      ))}
                      {previewData.pending.length > 10 && (
                        <Text style={styles.previewMore}>
                          + {previewData.pending.length - 10} more pending payments
                        </Text>
                      )}
                    </View>
                  )}

                  {previewData.items && previewData.items.length > 0 && (
                    <View style={styles.previewSection}>
                      <View style={styles.previewSectionHeader}>
                        <Ionicons name="cube-outline" size={18} color="#FF8A5B" />
                        <Text style={styles.previewSectionTitle}>
                          Items ({previewData.items.length})
                        </Text>
                      </View>
                      {previewData.items.slice(0, 10).map((item: any, index: number) => (
                        <View key={index} style={styles.previewItem}>
                          <View style={styles.previewItemHeader}>
                            <Text style={styles.previewItemTitle}>
                              {item.name || item.itemName}
                            </Text>
                            <Text style={styles.previewItemAmount}>
                              ₹{(item.price || item.amount || 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.previewItemDetail}>
                            Stock: {item.quantity || item.stock || 0} {item.unit || 'pcs'}
                          </Text>
                        </View>
                      ))}
                      {previewData.items.length > 10 && (
                        <Text style={styles.previewMore}>
                          + {previewData.items.length - 10} more items
                        </Text>
                      )}
                    </View>
                  )}

                  {previewData.payments && previewData.payments.length > 0 && (
                    <View style={styles.previewSection}>
                      <View style={styles.previewSectionHeader}>
                        <Ionicons name="cash-outline" size={18} color="#FF8A5B" />
                        <Text style={styles.previewSectionTitle}>
                          Payments ({previewData.payments.length})
                        </Text>
                      </View>
                      {previewData.payments.slice(0, 10).map((payment: any, index: number) => (
                        <View key={index} style={styles.previewItem}>
                          <View style={styles.previewItemHeader}>
                            <Text style={styles.previewItemTitle}>
                              {payment.invoiceNumber || `Payment ${index + 1}`}
                            </Text>
                            <Text style={[styles.previewItemAmount, styles.previewAmountPaid]}>
                              ₹{(payment.amount || 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.previewItemDetail}>
                            {payment.method || payment.paymentMethod || 'N/A'}
                          </Text>
                        </View>
                      ))}
                      {previewData.payments.length > 10 && (
                        <Text style={styles.previewMore}>
                          + {previewData.payments.length - 10} more payments
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.previewBottomSpacing} />
                </ScrollView>

                <View style={styles.previewFooter}>
                  <TouchableOpacity
                    style={styles.previewCloseButton}
                    onPress={() => setShowPreview(false)}
                  >
                    <Text style={styles.previewCloseButtonText}>Close Preview</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.previewEmptyState}>
                <Ionicons name="alert-circle-outline" size={52} color="#CCC" />
                <Text style={styles.previewEmptyTitle}>No Preview Available</Text>
                <Text style={styles.previewEmptyText}>
                  Unable to load preview data.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scheduleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule New Report</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.scheduleForm}>
              <Text style={styles.inputLabel}>Report Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={18} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Monthly Tax Summary"
                  value={newScheduleName}
                  onChangeText={setNewScheduleName}
                />
              </View>

              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyTabs}>
                {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.freqTab,
                      newScheduleFrequency === freq && styles.freqTabActive
                    ]}
                    onPress={() => setNewScheduleFrequency(freq)}
                  >
                    <Text style={[
                      styles.freqTabText,
                      newScheduleFrequency === freq && styles.freqTabTextActive
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newScheduleFrequency === 'weekly' && (
                <>
                  <Text style={styles.inputLabel}>Select Day</Text>
                  <View style={styles.daySelector}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayChip,
                          newScheduleDay === day && styles.dayChipActive
                        ]}
                        onPress={() => setNewScheduleDay(day)}
                      >
                        <Text style={[
                          styles.dayChipText,
                          newScheduleDay === day && styles.dayChipTextActive
                        ]}>
                          {day.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.summaryContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#4A90E2" />
                <Text style={styles.summaryText}>
                  This will generate a {selectedFormat.toUpperCase()} {selectedReport} report {newScheduleFrequency} {newScheduleFrequency === 'weekly' ? `on ${newScheduleDay}` : ''}.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.saveScheduleButton}
                onPress={saveScheduledReport}
              >
                <Text style={styles.saveScheduleButtonText}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Footer */}
      <Footer activeTab="Profile" navigation={navigation} />
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
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 28,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4ED',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0CC',
    gap: 6,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8A5B',
  },
  pendingSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D0E7FF',
    gap: 6,
  },
  pendingSyncBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reportTypeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reportDescription: {
    fontSize: 11,
    color: '#999',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4A90E2',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  dataRangeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRangeTabs: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dateRangeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
    marginRight: 6,
  },
  dateRangeTabActive: {
    backgroundColor: '#FF8A5B',
  },
  dateRangeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  dateRangeTabTextActive: {
    color: '#FFFFFF',
  },
  dateDisplay: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  formatOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  formatOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatOptionActive: {
    borderColor: '#4A90E2',
  },
  formatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8A5B',
    marginHorizontal: 16,
    marginTop: 22,
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#FF8A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    lineHeight: 16,
  },
  bottomSpacing: {
    height: 18,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customerSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerSelectorText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  clearCustomerText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#4A90E2',
    gap: 10,
  },
  previewButtonDisabled: {
    opacity: 0.6,
    borderColor: '#CCC',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerList: {
    maxHeight: 360,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  customerItemSelected: {
    backgroundColor: '#F5F9FF',
  },
  customerItemInfo: {
    flex: 1,
  },
  customerItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  customerItemPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    padding: 28,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
  previewModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '86%',
    display: 'flex',
    flexDirection: 'column',
  },
  previewScrollView: {
    flex: 1,
  },
  previewScrollContent: {
    paddingBottom: 14,
  },
  previewLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  previewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  previewEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    minHeight: 240,
  },
  previewEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  previewEmptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  previewHeader: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  offlineIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF8A5B',
  },
  previewDateRange: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  previewCustomer: {
    fontSize: 12,
    color: '#FF8A5B',
    fontWeight: '600',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  previewSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewItem: {
    backgroundColor: '#F8F9FA',
    padding: 11,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8A5B',
  },
  previewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  previewItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90E2',
  },
  previewAmountPending: {
    color: '#FF6B6B',
  },
  previewAmountPaid: {
    color: '#51CF66',
  },
  previewItemDetail: {
    fontSize: 11,
    color: '#666',
  },
  previewMore: {
    fontSize: 12,
    color: '#FF8A5B',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    paddingVertical: 6,
  },
  previewBottomSpacing: {
    height: 12,
  },
  previewFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  previewCloseButton: {
    backgroundColor: '#FF8A5B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Scheduled Reports Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createNewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A90E2',
  },
  scheduledReportsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduledReportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  scheduledItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scheduledItemInfo: {
    flex: 1,
  },
  scheduledItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  scheduledItemSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  moreButton: {
    padding: 4,
  },
  emptySchedules: {
    padding: 20,
    alignItems: 'center',
  },
  emptySchedulesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  historyHelpText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  
  // Schedule Modal Styles
  scheduleModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    width: '100%',
  },
  scheduleForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  frequencyTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  freqTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  freqTabActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  freqTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  freqTabTextActive: {
    color: '#FFFFFF',
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayChipActive: {
    backgroundColor: '#FF8A5B',
    borderColor: '#FF8A5B',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#4A90E2',
    lineHeight: 18,
    flex: 1,
  },
  saveScheduleButton: {
    backgroundColor: '#FF8A5B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#FF8A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveScheduleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
