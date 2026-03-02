import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Footer from '../Components/Footer';

interface ExportCenterScreenProps {
  navigation: any;
}

type ReportType = 'insights' | 'inventory' | 'tax' | 'outstanding';
type DateRangeType = 'preview' | 'week' | 'month' | 'custom';
type FormatType = 'pdf' | 'excel' | 'csv';

export default function ExportCenterScreen({ navigation }: ExportCenterScreenProps): React.JSX.Element {
  const [selectedReport, setSelectedReport] = useState<ReportType>('insights');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeType>('preview');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('pdf');
  const [startDate, setStartDate] = useState('Dec 12, 2025');
  const [endDate, setEndDate] = useState('Jan 19, 2026');
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      id: 'insights' as ReportType,
      title: 'Insights',
      description: 'Sales, Payments, and trends',
      icon: 'analytics-outline',
      badge: true,
      locked: false,
    },
    {
      id: 'inventory' as ReportType,
      title: 'Inventory Report',
      description: 'Stock tracking and analysis',
      icon: 'cube-outline',
      badge: false,
      locked: true,
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
    { id: 'excel' as FormatType, icon: 'grid', label: 'Excel', color: '#51CF66' },
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

  const handleDateRangeChange = () => {
    Alert.alert(
      'Select Date Range',
      'Date picker functionality would go here',
      [{ text: 'OK' }]
    );
  };

  const generateReportData = async () => {
    try {
      // Get data from AsyncStorage based on report type
      let reportData: any = {};

      switch (selectedReport) {
        case 'insights':
          const invoices = await AsyncStorage.getItem('@viveha_invoices');
          const payments = await AsyncStorage.getItem('@viveha_payments');
          reportData = {
            type: 'Insights Report',
            invoices: invoices ? JSON.parse(invoices) : [],
            payments: payments ? JSON.parse(payments) : [],
          };
          break;

        case 'tax':
          const taxInvoices = await AsyncStorage.getItem('@viveha_invoices');
          reportData = {
            type: 'Tax Report',
            invoices: taxInvoices ? JSON.parse(taxInvoices) : [],
          };
          break;

        case 'outstanding':
          const pendingPayments = await AsyncStorage.getItem('@viveha_pendings');
          reportData = {
            type: 'Customer Outstanding Report',
            pending: pendingPayments ? JSON.parse(pendingPayments) : [],
          };
          break;

        case 'inventory':
          const items = await AsyncStorage.getItem('@viveha_items');
          reportData = {
            type: 'Inventory Report',
            items: items ? JSON.parse(items) : [],
          };
          break;
      }

      return reportData;
    } catch (error) {
      console.error('Error generating report data:', error);
      return null;
    }
  };

  const formatDataAsCSV = (data: any): string => {
    let csv = '';

    if (data.type === 'Insights Report') {
      csv = 'Date,Invoice Number,Customer,Amount,Status\n';
      data.invoices.forEach((invoice: any) => {
        csv += `${invoice.date || 'N/A'},${invoice.invoiceNumber || 'N/A'},${invoice.customerName || 'N/A'},${invoice.total || 0},${invoice.status || 'N/A'}\n`;
      });
    } else if (data.type === 'Tax Report') {
      csv = 'Date,Invoice Number,Subtotal,Tax Amount,Total\n';
      data.invoices.forEach((invoice: any) => {
        const subtotal = invoice.subtotal || 0;
        const total = invoice.total || 0;
        const tax = total - subtotal;
        csv += `${invoice.date || 'N/A'},${invoice.invoiceNumber || 'N/A'},${subtotal},${tax},${total}\n`;
      });
    } else if (data.type === 'Customer Outstanding Report') {
      csv = 'Customer Name,Amount Due,Due Date,Invoice Number\n';
      data.pending.forEach((pending: any) => {
        csv += `${pending.customerName || 'N/A'},${pending.amount || 0},${pending.dueDate || 'N/A'},${pending.invoiceNumber || 'N/A'}\n`;
      });
    } else if (data.type === 'Inventory Report') {
      csv = 'Item Name,Quantity,Price,Category\n';
      data.items.forEach((item: any) => {
        csv += `${item.name || 'N/A'},${item.quantity || 0},${item.price || 0},${item.category || 'N/A'}\n`;
      });
    }

    return csv;
  };

  const formatDataAsText = (data: any): string => {
    let text = `${data.type}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Date Range: ${startDate} - ${endDate}\n`;
    text += `\n${'='.repeat(50)}\n\n`;

    if (data.type === 'Insights Report') {
      text += 'INVOICES\n';
      text += '-'.repeat(50) + '\n';
      data.invoices.forEach((invoice: any, index: number) => {
        text += `\n${index + 1}. Invoice #${invoice.invoiceNumber || 'N/A'}\n`;
        text += `   Customer: ${invoice.customerName || 'N/A'}\n`;
        text += `   Date: ${invoice.date || 'N/A'}\n`;
        text += `   Amount: ₹${invoice.total || 0}\n`;
        text += `   Status: ${invoice.status || 'N/A'}\n`;
      });

      const totalRevenue = data.invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      text += `\n${'='.repeat(50)}\n`;
      text += `Total Revenue: ₹${totalRevenue.toFixed(2)}\n`;
      text += `Total Invoices: ${data.invoices.length}\n`;
    } else if (data.type === 'Tax Report') {
      text += 'TAX SUMMARY\n';
      text += '-'.repeat(50) + '\n';
      let totalTax = 0;
      let totalAmount = 0;

      data.invoices.forEach((invoice: any, index: number) => {
        const subtotal = invoice.subtotal || 0;
        const total = invoice.total || 0;
        const tax = total - subtotal;
        totalTax += tax;
        totalAmount += total;

        text += `\n${index + 1}. Invoice #${invoice.invoiceNumber || 'N/A'}\n`;
        text += `   Subtotal: ₹${subtotal}\n`;
        text += `   Tax: ₹${tax.toFixed(2)}\n`;
        text += `   Total: ₹${total}\n`;
      });

      text += `\n${'='.repeat(50)}\n`;
      text += `Total Tax Collected: ₹${totalTax.toFixed(2)}\n`;
      text += `Total Amount: ₹${totalAmount.toFixed(2)}\n`;
    } else if (data.type === 'Customer Outstanding Report') {
      text += 'PENDING PAYMENTS\n';
      text += '-'.repeat(50) + '\n';
      let totalOutstanding = 0;

      data.pending.forEach((pending: any, index: number) => {
        totalOutstanding += pending.amount || 0;
        text += `\n${index + 1}. ${pending.customerName || 'N/A'}\n`;
        text += `   Amount Due: ₹${pending.amount || 0}\n`;
        text += `   Due Date: ${pending.dueDate || 'N/A'}\n`;
        text += `   Invoice: #${pending.invoiceNumber || 'N/A'}\n`;
      });

      text += `\n${'='.repeat(50)}\n`;
      text += `Total Outstanding: ₹${totalOutstanding.toFixed(2)}\n`;
      text += `Total Customers: ${data.pending.length}\n`;
    } else if (data.type === 'Inventory Report') {
      text += 'INVENTORY LIST\n';
      text += '-'.repeat(50) + '\n';
      let totalValue = 0;

      data.items.forEach((item: any, index: number) => {
        const itemValue = (item.quantity || 0) * (item.price || 0);
        totalValue += itemValue;
        text += `\n${index + 1}. ${item.name || 'N/A'}\n`;
        text += `   Quantity: ${item.quantity || 0}\n`;
        text += `   Price: ₹${item.price || 0}\n`;
        text += `   Value: ₹${itemValue.toFixed(2)}\n`;
        text += `   Category: ${item.category || 'N/A'}\n`;
      });

      text += `\n${'='.repeat(50)}\n`;
      text += `Total Items: ${data.items.length}\n`;
      text += `Total Inventory Value: ₹${totalValue.toFixed(2)}\n`;
    }

    return text;
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
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
          'There is no data available for this report. Please add some invoices, items, or customers first.',
          [{ text: 'OK' }]
        );
        setIsGenerating(false);
        return;
      }

      // Format data based on selected format
      let fileContent = '';
      let fileExtension = '';
      let mimeType = '';

      switch (selectedFormat) {
        case 'csv':
          fileContent = formatDataAsCSV(reportData);
          fileExtension = 'csv';
          mimeType = 'text/csv';
          break;
        case 'pdf':
        case 'excel':
          // For now, treat PDF and Excel as text files
          // In production, you'd use libraries like expo-print for PDF or xlsx for Excel
          fileContent = formatDataAsText(reportData);
          fileExtension = selectedFormat === 'pdf' ? 'txt' : 'txt';
          mimeType = 'text/plain';
          Alert.alert(
            'Note',
            `${selectedFormat.toUpperCase()} export is simulated. File will be saved as TXT format.`,
            [{ text: 'OK' }]
          );
          break;
      }

      // Generate filename
      const timestamp = new Date().getTime();
      const reportName = selectedReport.replace(/\s+/g, '_');
      const filename = `${reportName}_${timestamp}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: 'Export Report',
          UTI: mimeType,
        });
        
        Alert.alert(
          'Success',
          'Report generated successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Success',
          `Report saved to: ${filename}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        'Failed to generate report. Please try again.',
        [{ text: 'OK' }]
      );
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Center</Text>
        <View style={styles.placeholder} />
      </View>

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
                    <Ionicons name={report.icon as any} size={22} color="#666" />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportTitle}>{report.title}</Text>
                    <Text style={styles.reportDescription}>{report.description}</Text>
                  </View>
                </View>
                {report.badge && (
                  <View style={styles.badge} />
                )}
                {report.locked && (
                  <Ionicons name="lock-closed" size={18} color="#999" />
                )}
                {!report.badge && !report.locked && (
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
              {['preview', 'week', 'month', 'custom'].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.dateRangeTab,
                    selectedDateRange === range && styles.dateRangeTabActive
                  ]}
                  onPress={() => setSelectedDateRange(range as DateRangeType)}
                >
                  <Text style={[
                    styles.dateRangeTabText,
                    selectedDateRange === range && styles.dateRangeTabTextActive
                  ]}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{startDate} - {endDate}</Text>
              <TouchableOpacity onPress={handleDateRangeChange}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
                  <Ionicons name={format.icon as any} size={28} color={format.color} />
                </View>
                <Text style={styles.formatLabel}>{format.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scheduled Reports Section */}
        <View style={styles.section}>
          <View style={styles.scheduledHeader}>
            <Text style={styles.sectionLabel}>SCHEDULED REPORTS</Text>
            <TouchableOpacity style={styles.createNewButton}>
              <Ionicons name="add-circle" size={16} color="#4A90E2" />
              <Text style={styles.createNewText}>Create New</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scheduledItem}>
            <View style={styles.scheduledLeft}>
              <View style={styles.scheduledIcon}>
                <Ionicons name="time-outline" size={22} color="#666" />
              </View>
              <View>
                <Text style={styles.scheduledTitle}>Weekly Sales Summary</Text>
                <Text style={styles.scheduledDetails}>Every Monday | Excel</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.scheduledMenu}>
              <Ionicons name="ellipsis-vertical" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={styles.historyNote}>Files are stored for 30 days in the Export History</Text>
        </View>

        {/* Generate Report Button */}
        <TouchableOpacity 
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]} 
          onPress={handleGenerateReport}
          disabled={isGenerating}
        >
          <Ionicons 
            name={isGenerating ? "hourglass-outline" : "download-outline"} 
            size={24} 
            color="#FFFFFF" 
          />
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
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
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  reportTypeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  reportDescription: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4A90E2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  dataRangeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRangeTabs: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  dateRangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
  dateRangeTabActive: {
    backgroundColor: '#FF8A5B',
  },
  dateRangeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  dateRangeTabTextActive: {
    color: '#FFFFFF',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  formatOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  formatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  createNewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  scheduledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduledLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduledIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  scheduledDetails: {
    fontSize: 12,
    color: '#999',
  },
  scheduledMenu: {
    padding: 5,
  },
  historyNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8A5B',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 30,
  },
});
