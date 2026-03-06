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
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useNetworkStatus } from '../utils/NetworkManager';

interface InvoicePreviewScreenProps {
  navigation: any;
  route: {
    params?: {
      invoice?: Invoice;
      isPreview?: boolean;
    };
  };
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  tax: number;
  discount: number;
}

interface CustomCharge {
  id: string;
  heading: string;
  amount: number;
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
}

interface Invoice {
  number: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  total?: number;
  grandTotal?: number;
  subTotal?: number;
  tax?: number;
  discount?: number;
  customCharges?: CustomCharge[];
  additionalFees?: AdditionalFee[];
}

interface ShopDetails {
  shopName?: string;
  location?: string;
  mobile?: string;
  city?: string;
}

export default function InvoicePreviewScreen({ navigation, route }: InvoicePreviewScreenProps): React.JSX.Element {
  const { invoice: routeInvoice, isPreview } = route.params || {};
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  const [invoice, setInvoice] = useState<Invoice | null>(routeInvoice || null);
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [headerColor, setHeaderColor] = useState<string>('#5B8DEF');
  const [showBrandLogo, setShowBrandLogo] = useState<boolean>(true);
  const [showGSTUIN, setShowGSTUIN] = useState<boolean>(true);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);

  useEffect(() => {
    loadShopDetails();
    loadInvoiceSettings();
  }, []);

  const loadShopDetails = async (): Promise<void> => {
    try {
      const details = await AsyncStorage.getItem('@viveha_shop_details');
      if (details) {
        setShopDetails(JSON.parse(details));
      }
    } catch (error) {
      console.error('Error loading shop details:', error);
    }
  };

  const loadInvoiceSettings = async (): Promise<void> => {
    try {
      const settings = await AsyncStorage.getItem('@viveha_invoice_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.headerColor) {
          setHeaderColor(parsed.headerColor);
        }
        if (parsed.showBrandLogo !== undefined) {
          setShowBrandLogo(parsed.showBrandLogo);
        }
        if (parsed.showGSTUIN !== undefined) {
          setShowGSTUIN(parsed.showGSTUIN);
        }
        if (parsed.showQRCode !== undefined) {
          setShowQRCode(parsed.showQRCode);
        }
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    }
  };

  const numberToWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanOneThousand = (n: number): string => {
      if (n >= 100) {
        return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanOneThousand(n % 100);
      }
      if (n >= 20) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      }
      if (n >= 10) {
        return teens[n - 10];
      }
      return ones[n];
    };

    if (amount === 0) return 'Zero';

    // Simple implementation handling up to thousands for now as per common use case
    // For production, a robust library or extended function is better
    // This is a basic visual placeholder implementation

    let words = '';
    const num = Math.floor(amount);

    if (num >= 1000) {
      words += convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
      words += convertLessThanOneThousand(num % 1000);
    } else {
      words += convertLessThanOneThousand(num);
    }

    return words.trim() + ' Rupees Only';
  };

  const generateInvoiceHtml = (invoice: Invoice): string => {
    // Calculate values from items if not provided in invoice
    let calculatedSubTotal = 0;
    let calculatedTax = 0;
    let calculatedDiscount = 0; // Discount feature disabled
    
    (invoice.items || []).forEach(item => {
      const itemSubtotal = (item.price || 0) * (item.quantity || 0);
      calculatedSubTotal += itemSubtotal;
      calculatedTax += (itemSubtotal * (item.tax || 0)) / 100;
      // Discount calculation disabled
      // calculatedDiscount += (itemSubtotal * (item.discount || 0)) / 100;
    });

    // Use calculated values as fallback
    const subTotal = invoice.subTotal !== undefined ? invoice.subTotal.toFixed(2) : calculatedSubTotal.toFixed(2);
    const tax = invoice.tax !== undefined ? invoice.tax.toFixed(2) : calculatedTax.toFixed(2);
    const discount = invoice.discount !== undefined ? invoice.discount.toFixed(2) : calculatedDiscount.toFixed(2);
    
    // Calculate final total
    const calculatedTotal = calculatedSubTotal + calculatedTax - calculatedDiscount;
    const totalAmount = (invoice.total || invoice.grandTotal || calculatedTotal).toFixed(2);

    // Calculate taxable amount (subtotal - discount)
    const taxableAmount = (parseFloat(subTotal) - parseFloat(discount)).toFixed(2);
    
    // Split tax into SGST and CGST (half each for GST)
    const sgst = (parseFloat(tax) / 2).toFixed(2);
    const cgst = (parseFloat(tax) / 2).toFixed(2);

    const shopName = shopDetails?.shopName || 'Studio Den';
    const shopLocation = shopDetails?.location || '123, Main Street, City';
    const shopPhone = shopDetails?.mobile || '9876543210';

    // Number to words for HTML
    const amountInWords = numberToWords(parseFloat(totalAmount));

    const itemsRows = (invoice.items || []).map((item, index) => {
      const itemSubtotal = (item.price || 0) * (item.quantity || 0);
      const itemTaxAmount = (itemSubtotal * (item.tax || 0)) / 100;
      const itemDiscountAmount = 0; // Discount feature disabled
      const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;
      
      return `
      <tr style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};">
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151;">${item.name}</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: center;">${item.quantity || 0}</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: center;">${(item.tax || 0)}%</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: right;">₹${itemSubtotal.toFixed(2)}</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: center;">₹${(itemTaxAmount / 2).toFixed(2)}</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: center;">₹${(itemTaxAmount / 2).toFixed(2)}</td>
        <td style="padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; color: #374151; text-align: right; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; color: #111; margin: 0; padding: 40px; background-color: white; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .brand-logo { font-size: 24px; font-weight: 800; color: #333; display: flex; align-items: center; gap: 8px; }
            .logo-icon { width: 30px; height: 30px; background: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%); border-radius: 8px; }
            .powered-by { text-align: right; }
            .powered-text { font-size: 10px; color: #9CA3AF; margin-bottom: 4px; }
            .isaii-logo { font-size: 16px; font-weight: bold; color: #333; }
            
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .sender-details { max-width: 40%; }
            .sender-name { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 6px; }
            .sender-address { font-size: 11px; color: #6B7280; line-height: 1.5; }
            
            .invoice-details-grid { display: grid; grid-template-columns: auto auto; gap: 20px 40px; }
            .detail-group { }
            .detail-label { font-size: 10px; font-weight: 600; color: #3B82F6; margin-bottom: 4px; }
            .detail-value { font-size: 12px; font-weight: 600; color: #111; }
            .total-amount-box { margin-top: 10px; }
            .total-amount { font-size: 24px; font-weight: 700; color: #3B82F6; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; }
            th { background-color: #3B82F6; color: white; padding: 12px; font-size: 10px; text-transform: uppercase; text-align: left; font-weight: 600; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .summary-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .amount-words { max-width: 50%; }
            .words-label { font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 4px; }
            .words-value { font-size: 12px; color: #3B82F6; font-weight: 500; }
            
            .calculations { width: 250px; }
            .calc-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .calc-label { font-size: 11px; color: #6B7280; }
            .calc-value { font-size: 11px; font-weight: 600; color: #111; }
            .calc-total { margin-top: 10px; padding-top: 10px; border-top: 1px solid #E5E7EB; }
            .calc-total .calc-label { font-size: 13px; font-weight: 700; color: #111; }
            .calc-total .calc-value { font-size: 16px; font-weight: 700; color: #3B82F6; }
            
            .footer { display: flex; gap: 40px; border-top: 1px dashed #E5E7EB; padding-top: 30px; }
            .footer-col { flex: 1; }
            .footer-title { font-size: 11px; font-weight: 700; color: #111; margin-bottom: 10px; }
            .terms-list { font-size: 9px; color: #6B7280; line-height: 1.6; margin: 0; padding-left: 15px; }
            .terms-list li { margin-bottom: 4px; }
            
            .bank-details { background-color: #F9FAFB; padding: 15px; border-radius: 8px; }
            .bank-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .bank-label { font-size: 9px; color: #6B7280; }
            .bank-value { font-size: 9px; font-weight: 600; color: #111; }
            
            .qr-section { margin-top: 15px; display: flex; align-items: center; gap: 10px; }
            .qr-code { width: 60px; height: 60px; background-color: #eee; }
            .upi-text { font-size: 9px; color: #6B7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-logo">
              <span style="color: #6366f1;">viveha</span>.ai
            </div>
            <div class="powered-by">
              <div class="powered-text">Powered by</div>
              <div class="isaii-logo">isaii.ai</div>
              <div class="powered-text">8606892145</div>
            </div>
          </div>

          <div class="invoice-meta">
            <div class="sender-details">
              <div class="sender-name">${shopName}</div>
              <div class="sender-address">
                ${shopLocation}<br>
                GST: 29ABCDE1234F1Z5<br>
                PAN: ABCDE1234F
              </div>
            </div>
            
            <div class="invoice-details-grid">
              <div class="detail-group">
                <div class="detail-label">Service Details:</div>
                <div style="margin-bottom: 4px;"><span style="color: #6B7280; font-size: 10px;">Invoice #:</span> <span class="detail-value">${invoice.number}</span></div>
                <div style="margin-bottom: 4px;"><span style="color: #6B7280; font-size: 10px;">Invoice Date:</span> <span class="detail-value">${invoice.invoiceDate}</span></div>
                <div><span style="color: #6B7280; font-size: 10px;">Due Date:</span> <span class="detail-value">${invoice.dueDate}</span></div>
              </div>
              
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%">Item/Service Description</th>
                <th class="text-center">Qty.</th>
                <th class="text-center">GST</th>
                <th class="text-right">Taxable Amount</th>
                <th class="text-center">SGST</th>
                <th class="text-center">CGST</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="amount-words">
              <div class="words-label">Invoice Total In Words:</div>
              <div class="words-value">${amountInWords}</div>
            </div>
            
            <div class="calculations">
              <div class="calc-row">
                <span class="calc-label">Sub Total</span>
                <span class="calc-value">₹${subTotal}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">Taxable Amount</span>
                <span class="calc-value">₹${taxableAmount}</span>
              </div>
              ${parseFloat(tax) > 0 ? `
              <div class="calc-row">
                <span class="calc-label">SGST</span>
                <span class="calc-value">₹${sgst}</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">CGST</span>
                <span class="calc-value">₹${cgst}</span>
              </div>
              ` : ''}
              ${invoice.customCharges && invoice.customCharges.length > 0 ? invoice.customCharges.map(charge => `
              <div class="calc-row">
                <span class="calc-label">${charge.heading}</span>
                <span class="calc-value">₹${charge.amount.toFixed(2)}</span>
              </div>
              `).join('') : ''}
              ${invoice.additionalFees && invoice.additionalFees.length > 0 ? invoice.additionalFees.map(fee => `
              <div class="calc-row">
                <span class="calc-label">${fee.name}</span>
                <span class="calc-value">₹${fee.amount.toFixed(2)}</span>
              </div>
              `).join('') : ''}
              <div class="calc-row calc-total">
                <span class="calc-label">Total Due</span>
                <span class="calc-value">₹${totalAmount}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-col">
              <div class="footer-title">Terms and Conditions</div>
              <ol class="terms-list">
                 <li>Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.</li>
                 <li>Please quote invoice number when remitting funds.</li>
              </ol>
              
              <div class="footer-title" style="margin-top: 15px;">Additional Notes</div>
              <p style="font-size: 9px; color: #6B7280; line-height: 1.5;">
                It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.
              </p>
              
              <div style="font-size: 9px; font-weight: bold; margin-top: 10px;">
                For any enquiries, email us on funkar@gmail.com or call us on +91 9876543210
              </div>
            </div>
            
            <div class="footer-col">
              <div class="footer-title">Bank & Payment Details</div>
              <div class="bank-details">
                <div class="bank-row">
                  <span class="bank-label">Account Holder Name:</span>
                  <span class="bank-value">Student Labs</span>
                </div>
                <div class="bank-row">
                  <span class="bank-label">Account Number:</span>
                  <span class="bank-value">45244751787</span>
                </div>
                <div class="bank-row">
                  <span class="bank-label">IFSC:</span>
                  <span class="bank-value">HDFC0475757</span>
                </div>
                <div class="bank-row">
                  <span class="bank-label">Account Type:</span>
                  <span class="bank-value">Savings</span>
                </div>
                <div class="bank-row">
                  <span class="bank-label">Bank:</span>
                  <span class="bank-value">HDFC Bank</span>
                </div>
                
                <div class="qr-section">
                  <span class="bank-label">UPI:</span>
                   <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="bank-value">footerlabs@okhdfc</span>
                      <!-- QRCode Placeholder in HTML -->
                      <div style="width: 40px; height: 40px; background: #000;"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async (): Promise<void> => {
    try {
      if (!invoice) return;
      const html = generateInvoiceHtml(invoice);
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print invoice.');
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      if (!invoice) return;
      const html = generateInvoiceHtml(invoice);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share invoice.');
    }
  };

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name={"arrow-back" as any} size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Preview</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerEmpty}>
          <Text>No invoice data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAmount = (invoice.total || invoice.grandTotal || 0).toFixed(2);
  const amountWords = numberToWords(parseFloat(totalAmount));

  // Calculate actual values from items
  let calculatedSubTotal = 0;
  let calculatedTax = 0;
  let calculatedDiscount = 0;
  
  (invoice.items || []).forEach(item => {
    const itemSubtotal = (item.price || 0) * (item.quantity || 0);
    calculatedSubTotal += itemSubtotal;
    calculatedTax += (itemSubtotal * (item.tax || 0)) / 100;
    // Discount calculation disabled
    // calculatedDiscount += (itemSubtotal * (item.discount || 0)) / 100;
  });

  const subTotalDisplay = (invoice.subTotal !== undefined ? invoice.subTotal : calculatedSubTotal).toFixed(2);
  const taxDisplay = (invoice.tax !== undefined ? invoice.tax : calculatedTax).toFixed(2);
  const discountDisplay = (invoice.discount !== undefined ? invoice.discount : calculatedDiscount).toFixed(2);
  const taxableAmountDisplay = (parseFloat(subTotalDisplay) - parseFloat(discountDisplay)).toFixed(2);
  const sgstDisplay = (parseFloat(taxDisplay) / 2).toFixed(2);
  const cgstDisplay = (parseFloat(taxDisplay) / 2).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      {/* Navbar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={"arrow-back" as any} size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Preview</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name={"create-outline" as any} size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Success Banner */}
        {!isPreview && (
          <View style={styles.successBanner}>
            <View style={styles.successIconBg}>
              <Ionicons name={"checkmark-circle-outline" as any} size={40} color="#4ADE80" />
            </View>
            <Text style={styles.successTitle}>Your Invoice Is Ready</Text>
            <Text style={styles.successSub}>Print the Invoice or send it to your customer</Text>
          </View>
        )}

        {/* Invoice Paper */}
        <View style={styles.invoicePaper}>

          {/* Brand Header */}
          {showBrandLogo && (
            <View style={styles.paperHeader}>
              <View style={styles.brandContainer}>
                <Image source={require('../assets/logo2.png')} style={styles.brandIcon} resizeMode="contain" />
                <Text style={styles.brandName}>viveha.ai</Text>
              </View>
              <View style={styles.poweredByContainer}>
                <Text style={styles.poweredLabel}>Powered by</Text>
                <Text style={styles.poweredName}>isaii.ai</Text>
                <Text style={styles.poweredId}>8606892145</Text>
              </View>
            </View>
          )}

          {/* Sender & Invoice Info */}
          <View style={styles.metaRow}>
            <View style={styles.senderSection}>
              <Text style={styles.senderName}>{shopDetails?.shopName || 'Studio Den'}</Text>
              <Text style={styles.senderAddress}>
                {shopDetails?.location || '294, 5th Cross, Girinagar,\nBangalore, India - 560085'}{'\n'}
                {showGSTUIN && 'GST: 29ABCDE1234F1Z5\n'}
                PAN: ABCDE1234F
              </Text>
            </View>

            <View style={styles.invoiceMetaSection}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Service Details:</Text>
                <View style={styles.metaPair}>
                  <Text style={styles.subLabel}>Invoice #:</Text>
                  <Text style={styles.subValue}>{invoice.number}</Text>
                </View>
                <View style={styles.metaPair}>
                  <Text style={styles.subLabel}>Invoice Date:</Text>
                  <Text style={styles.subValue}>{invoice.invoiceDate}</Text>
                </View>
                <View style={styles.metaPair}>
                  <Text style={styles.subLabel}>Due Date:</Text>
                  <Text style={styles.subValue}>{invoice.dueDate}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            <View style={[styles.tableHeader, { backgroundColor: headerColor }]}>
              <Text style={[styles.th, styles.colDesc]}>Item/Service Description</Text>

              <Text style={[styles.th, styles.colBrief, { textAlign: 'center' }]}>Qty.</Text>
              <Text style={[styles.th, styles.colBrief, { textAlign: 'center' }]}>GST</Text>
              <Text style={[styles.th, styles.colAmount, { textAlign: 'right' }]}>Taxable {'\n'}Amount</Text>
              <Text style={[styles.th, styles.colDetail, { textAlign: 'center' }]}>SGST</Text>
              <Text style={[styles.th, styles.colDetail, { textAlign: 'center' }]}>CGST</Text>
              <Text style={[styles.th, styles.colAmount, { textAlign: 'right' }]}>Amount</Text>
            </View>

            {invoice.items && invoice.items.map((item, idx) => {
              const itemSubtotal = (item.price || 0) * (item.quantity || 0);
              const itemTaxAmount = (itemSubtotal * (item.tax || 0)) / 100;
              const itemDiscountAmount = (itemSubtotal * (item.discount || 0)) / 100;
              const lineTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;
              
              return (
                <View key={idx} style={[styles.tableRow, idx % 2 !== 0 && styles.rowAlt]}>
                  <Text style={[styles.td, styles.colDesc]}>{item.name}</Text>
                  <Text style={[styles.td, styles.colBrief, { textAlign: 'center' }]}>{item.quantity}</Text>
                  <Text style={[styles.td, styles.colBrief, { textAlign: 'center' }]}>{(item.tax || 0)}%</Text>
                  <Text style={[styles.td, styles.colAmount, { textAlign: 'right' }]}>₹{itemSubtotal.toFixed(2)}</Text>
                  <Text style={[styles.td, styles.colDetail, { textAlign: 'center' }]}>₹{(itemTaxAmount / 2).toFixed(2)}</Text>
                  <Text style={[styles.td, styles.colDetail, { textAlign: 'center' }]}>₹{(itemTaxAmount / 2).toFixed(2)}</Text>
                  <Text style={[styles.td, styles.colAmount, { textAlign: 'right', fontWeight: 'bold' }]}>₹{lineTotal.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Country of supply: <Text style={styles.normalText}>India</Text></Text>
              <Text style={styles.summaryLabel}>Place of supply: <Text style={styles.normalText}>{shopDetails?.city || 'Bangalore'}</Text></Text>

              <Text style={[styles.summaryLabel, { marginTop: 15 }]}>Invoice Total In Words:</Text>
              <Text style={styles.wordsText}>{amountWords}</Text>
            </View>

            <View style={styles.summaryRight}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Sub Total</Text>
                <Text style={styles.sumValue}>₹{subTotalDisplay}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Taxable Amount</Text>
                <Text style={styles.sumValue}>₹{taxableAmountDisplay}</Text>
              </View>
              {parseFloat(taxDisplay) > 0 && (
                <>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>SGST</Text>
                    <Text style={styles.sumValue}>₹{sgstDisplay}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>CGST</Text>
                    <Text style={styles.sumValue}>₹{cgstDisplay}</Text>
                  </View>
                </>
              )}

              {/* Custom Charges */}
              {invoice.customCharges && invoice.customCharges.length > 0 && (
                <>
                  {invoice.customCharges.map((charge, idx) => (
                    <View key={idx} style={styles.sumRow}>
                      <Text style={styles.sumLabel}>{charge.heading}</Text>
                      <Text style={styles.sumValue}>₹{charge.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Additional Fees */}
              {invoice.additionalFees && invoice.additionalFees.length > 0 && (
                <>
                  {invoice.additionalFees.map((fee, idx) => (
                    <View key={idx} style={styles.sumRow}>
                      <Text style={styles.sumLabel}>{fee.name}</Text>
                      <Text style={styles.sumValue}>₹{fee.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}

              <View style={[styles.sumRow, { marginTop: 10 }]}>
                <Text style={styles.totalDueLabel}>Total Due</Text>
                <Text style={styles.totalDueValue}>₹{totalAmount}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.paperFooter}>
            <View style={styles.termsCol}>
              <Text style={styles.footerTitle}>Terms and Conditions</Text>
              <Text style={styles.legalText}>1. Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.</Text>
              <Text style={styles.legalText}>2. Please quote invoice number when remitting funds.</Text>

              <Text style={[styles.footerTitle, { marginTop: 10 }]}>Additional Notes</Text>
              <Text style={styles.legalText}>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here.</Text>

              <Text style={[styles.legalText, { marginTop: 10, fontWeight: 'bold' }]}>For any enquiries, email us on funkar@gmail.com or call us on +91 9876543210</Text>
            </View>

            <View style={styles.bankCol}>
              <Text style={styles.footerTitle}>Bank & Payment Details</Text>
              <View style={styles.bankRow}><Text style={styles.lbl}>Account Holder Name:</Text><Text style={[styles.val, { flex: 1, textAlign: 'right' }]}>Student Labs</Text></View>
              <View style={styles.bankRow}><Text style={styles.lbl}>Account Number:</Text><Text style={styles.val}>45244751787</Text></View>
              <View style={styles.bankRow}><Text style={styles.lbl}>IFSC:</Text><Text style={styles.val}>HDFC0475757</Text></View>
              <View style={styles.bankRow}><Text style={styles.lbl}>Account Type:</Text><Text style={styles.val}>Savings</Text></View>
              <View style={styles.bankRow}><Text style={styles.lbl}>Bank:</Text><Text style={styles.val}>HDFC Bank</Text></View>

              <View style={styles.ubiRow}>
                <Text style={styles.lbl}>UPI:</Text>
                <Text style={styles.val}>footerlabs@okhdfc</Text>
              </View>
              <Text style={[styles.lbl, { marginTop: 4 }]}>UPI - Scan & Pay</Text>
              {showQRCode && (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name={"qr-code-outline" as any} size={32} color="#000" />
                </View>
              )}
            </View>
          </View>

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.savePrintBtn} onPress={handlePrint}>
          <Ionicons name={"print-outline" as any} size={20} color="#fff" />
          <Text style={styles.btnText}>Save & Print</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name={"download-outline" as any} size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name={"share-social-outline" as any} size={24} color="#333" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10, backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backButton: { padding: 5 },
  editButton: { padding: 5 },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 20 },

  successBanner: {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 15, borderRadius: 16,
    paddingVertical: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  successIconBg: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  successSub: { fontSize: 12, color: '#666' },

  invoicePaper: {
    backgroundColor: '#fff', margin: 20, borderRadius: 12, padding: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
  },
  paperHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 24, height: 24 },
  brandName: { fontSize: 18, fontWeight: '800', color: '#111' },
  poweredByContainer: { alignItems: 'flex-end' },
  poweredLabel: { fontSize: 9, color: '#9CA3AF' },
  poweredName: { fontSize: 13, fontWeight: '700', color: '#374151' },
  poweredId: { fontSize: 9, color: '#9CA3AF' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  senderSection: { flex: 0.35, paddingRight: 10 },
  senderName: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 4 },
  senderAddress: { fontSize: 9, color: '#4B5563', lineHeight: 14 },

  invoiceMetaSection: { flex: 0.65, flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: {},
  metaColRight: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 9, fontWeight: '700', color: '#3B82F6', marginBottom: 6 },
  metaPair: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, gap: 5 },
  subLabel: { fontSize: 9, color: '#6B7280' },
  subValue: { fontSize: 9, fontWeight: '600', color: '#111' },
  paidZero: { fontSize: 12, fontWeight: '700', color: '#111' },
  bigAmount: { fontSize: 16, fontWeight: '800', color: '#3B82F6', marginTop: 4 },

  table: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#3B82F6', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 4 },
  th: { fontSize: 7, fontWeight: '700', color: '#fff' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowAlt: { backgroundColor: '#F8FAFC' },
  td: { fontSize: 7, color: '#333' },

  colDesc: { flex: 3 },
  colBrief: { flex: 0.5 },
  colDetail: { flex: 0.7 },
  colAmount: { flex: 1 },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 15 },

  summarySection: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLeft: { flex: 1, paddingRight: 10 },
  summaryLabel: { fontSize: 9, color: '#6B7280', fontWeight: 'bold' },
  normalText: { fontWeight: '400', color: '#111' },
  wordsText: { fontSize: 10, color: '#3B82F6', fontWeight: '600', marginTop: 4 },

  summaryRight: { width: 140 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sumLabel: { fontSize: 9, color: '#6B7280' },
  sumValue: { fontSize: 9, fontWeight: '600', color: '#111' },
  totalDueLabel: { fontSize: 10, fontWeight: '700', color: '#111' },
  totalDueValue: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },

  paperFooter: { flexDirection: 'row', marginTop: 30, gap: 10 },
  termsCol: { flex: 6 },
  bankCol: { flex: 4, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 },

  footerTitle: { fontSize: 9, fontWeight: '700', color: '#111', marginBottom: 6 },
  legalText: { fontSize: 7, color: '#6B7280', lineHeight: 10, marginBottom: 4 },

  bankRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  lbl: { fontSize: 7, color: '#6B7280' },
  val: { fontSize: 7, fontWeight: '600', color: '#111' },
  ubiRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 2 },
  qrPlaceholder: { marginTop: 5, alignItems: 'center' },

  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    flexDirection: 'row', padding: 15, gap: 10
  },
  savePrintBtn: {
    flex: 1, backgroundColor: '#EF4444', borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', height: 48, gap: 8
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  iconBtn: {
    width: 48, height: 48, borderRadius: 10, backgroundColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center'
  },
});
