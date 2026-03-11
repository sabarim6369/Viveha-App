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
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { fetchClientProfile, useNetworkStatus } from '../utils/NetworkManager';
import { Asset } from 'expo-asset';
import apiurl from '../api';

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

interface ClientInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gstNo?: string;
}

interface Invoice {
  number: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  clientInfo?: ClientInfo;
  total?: number;
  totalAmount?: number;
  grandTotal?: number;
  subTotal?: number;
  tax?: number;
  discount?: number;
  paidAmount?: number;
  customCharges?: CustomCharge[];
  additionalFees?: AdditionalFee[];
}

interface ShopDetails {
  shopName?: string;
  ownerName?: string;
  profileImage?: string;
  location?: string;
  state?: string;
  mobile?: string;
  phoneNumber?: string;
  city?: string;
  gstin?: string;
}

interface PaymentDetails {
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentQrUrl?: string;
}

export default function InvoicePreviewScreen({ navigation, route }: InvoicePreviewScreenProps): React.JSX.Element {
  const poweredByName = 'isaii.ai';
  const poweredByPhone = '9003557604';
  const { invoice: routeInvoice, isPreview } = route.params || {};
  const { isConnected, isInternetReachable } = useNetworkStatus();

  const invoiceRef = useRef<View>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(routeInvoice || null);
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [headerColor, setHeaderColor] = useState<string>('#5B8DEF');
  const [showBrandLogo, setShowBrandLogo] = useState<boolean>(true);
  const [showGSTUIN, setShowGSTUIN] = useState<boolean>(true);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [qrImageLoadFailed, setQrImageLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    loadShopDetails();
    loadPaymentDetails();
    loadInvoiceSettings();
  }, []);

  useEffect(() => {
    setQrImageLoadFailed(false);
  }, [paymentDetails?.paymentQrUrl]);

  const loadShopDetails = async (): Promise<void> => {
    try {
      const details = await AsyncStorage.getItem('@viveha_shop_details');
      if (details) {
        setShopDetails(JSON.parse(details));
      }

      const latestProfile = await fetchClientProfile();
      if (latestProfile) {
        setShopDetails((prev) => ({
          ...prev,
          ...latestProfile,
        }));
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

  const loadPaymentDetails = async (): Promise<void> => {
    try {
      const cachedSettings = await AsyncStorage.getItem('@viveha_payment_settings');
      if (cachedSettings) {
        setPaymentDetails(JSON.parse(cachedSettings));
      }

      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');
      if (!token || !clientId) {
        return;
      }

      const response = await fetch(`${apiurl}/auth/client/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.success && data.client) {
        const latestPaymentDetails: PaymentDetails = {
          upiId: data.client.upiId || '',
          bankName: data.client.bankName || '',
          accountNumber: data.client.accountNumber || '',
          ifscCode: data.client.ifscCode || '',
          paymentQrUrl: data.client.paymentQrUrl || '',
        };

        setPaymentDetails(latestPaymentDetails);
        await AsyncStorage.setItem('@viveha_payment_settings', JSON.stringify(latestPaymentDetails));
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
    }
  };

  const loadAssetAsBase64 = async (assetModule: number): Promise<string> => {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    const assetUri = asset.localUri || asset.uri;
    const assetData = await FileSystem.readAsStringAsync(assetUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${assetData}`;
  };

  const loadImageUriAsBase64 = async (uri: string): Promise<string> => {
    if (!uri?.trim()) return '';
    const isJpeg = /\.(jpe?g|jfif)$/i.test(uri.split('?')[0]);
    const mime = isJpeg ? 'image/jpeg' : 'image/png';
    const ext = isJpeg ? '.jpg' : '.png';
    try {
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        const tempPath = `${FileSystem.cacheDirectory}qr_${Date.now()}${ext}`;
        const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
        if (downloadResult.status !== 200) return '';
        const downloadedData = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:${mime};base64,${downloadedData}`;
      }
      const localData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mime};base64,${localData}`;
    } catch (error) {
      console.warn('loadImageUriAsBase64 error:', error);
      return '';
    }
  };

  const getBrandLogoBase64 = async (): Promise<string> => {
    try {
      if (shopDetails?.profileImage) {
        return await loadImageUriAsBase64(shopDetails.profileImage);
      }
    } catch (error) {
      console.error('Error loading shop image:', error);
    }

    try {
      return await loadAssetAsBase64(require('../assets/logo2.png'));
    } catch (error) {
      console.error('Error loading fallback logo:', error);
      return '';
    }
  };

  const getHomeBadgeBase64 = async (): Promise<string> => {
    try {
      return await loadAssetAsBase64(require('../assets/Home3.png'));
    } catch (error) {
      console.error('Error loading Home3 badge:', error);
      return '';
    }
  };

  const getGeneratedUpiQrBase64 = async (totalAmountValue: number): Promise<string> => {
    if (!paymentDetails?.upiId) return '';
    try {
      const upiString = `upi://pay?pa=${paymentDetails.upiId.trim()}&pn=${(shopDetails?.shopName || 'Viveha').trim()}&am=${totalAmountValue.toFixed(2)}&cu=INR&mc=0000`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
      const qrDownload = await FileSystem.downloadAsync(
        qrApiUrl,
        `${FileSystem.documentDirectory}temp_qr.png`
      );
      if (qrDownload.status !== 200) return '';
      const qrBase64 = await FileSystem.readAsStringAsync(qrDownload.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${qrBase64}`;
    } catch (error) {
      console.error('Error generating UPI QR:', error);
      return '';
    }
  };

  const getQrCodeBase64 = async (totalAmountValue: number): Promise<string> => {
    // Prioritize uploaded QR image from DB if available
    if (paymentDetails?.paymentQrUrl) {
      try {
        const base64 = await loadImageUriAsBase64(paymentDetails.paymentQrUrl);
        if (base64) return base64;
      } catch (error) {
        console.warn('Failed to load payment QR from DB, falling back to UPI:', error);
      }
    }
    // Fallback to auto-generated UPI QR
    return getGeneratedUpiQrBase64(totalAmountValue);
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

  const generateInvoiceHtml = (
    invoice: Invoice,
    brandLogoBase64?: string,
    homeBadgeBase64?: string,
    qrCodeBase64?: string
  ): string => {
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
    const totalAmount = (invoice.total || invoice.totalAmount || invoice.grandTotal || calculatedTotal).toFixed(2);
    const paidAmount = (invoice.paidAmount || 0).toFixed(2);

    // Calculate taxable amount (subtotal - discount)
    const taxableAmount = (parseFloat(subTotal) - parseFloat(discount)).toFixed(2);

    // Split tax into SGST and CGST (half each for GST)
    const sgst = (parseFloat(tax) / 2).toFixed(2);
    const cgst = (parseFloat(tax) / 2).toFixed(2);

    const shopName = shopDetails?.shopName || 'Kdjdjkdkkd';
    const shopAddressParts = [shopDetails?.location, shopDetails?.city, shopDetails?.state].filter(Boolean);
    const shopLocation = shopAddressParts.join(', ');
    const shopPhone = shopDetails?.phoneNumber || shopDetails?.mobile || '';
    const shopCity = shopDetails?.city || 'Congrats';
    const shopGstin = shopDetails?.gstin || '';
    const paymentRows = [
      paymentDetails?.bankName ? `<div class="bank-row"><span class="bank-label">Bank:</span><span class="bank-value">${paymentDetails.bankName}</span></div>` : '',
      paymentDetails?.accountNumber ? `<div class="bank-row"><span class="bank-label">Account Number:</span><span class="bank-value">${paymentDetails.accountNumber}</span></div>` : '',
      paymentDetails?.ifscCode ? `<div class="bank-row"><span class="bank-label">IFSC:</span><span class="bank-value">${paymentDetails.ifscCode}</span></div>` : '',
    ].filter(Boolean).join('');
    const hasPaymentDetails = Boolean(paymentRows || paymentDetails?.upiId || (showQRCode && qrCodeBase64));

    // Number to words for HTML
    const amountInWords = numberToWords(parseFloat(totalAmount));

    // Get header color with fallback
    const tableHeaderColor = headerColor || '#EF4444';

    const itemsRows = (invoice.items || []).map((item, index) => {
      const itemSubtotal = (item.price || 0) * (item.quantity || 0);
      const itemTaxAmount = (itemSubtotal * (item.tax || 0)) / 100;
      const itemDiscountAmount = 0; // Discount feature disabled
      const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

      return `
      <tr style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};">
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937;">${item.name}</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: center;">${item.quantity || 0}</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: center;">${(item.tax || 0)}%</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: right;">₹${itemSubtotal.toFixed(2)}</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: center;">₹${(itemTaxAmount / 2).toFixed(2)}</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: center;">₹${(itemTaxAmount / 2).toFixed(2)}</td>
        <td style="padding: 10px 12px; font-size: 10px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: right; font-weight: 600;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              color: #111; 
              background-color: white; 
              padding: 0;
            }
            .invoice-container {
              max-width: 100%;
              margin: 0 auto;
              background-color: white;
              padding: 0;
            }
            
            /* Header */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #F3F4F6;
            }
            .brand-logo {
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 1;
            }
            .logo-icon {
              width: 38px;
              height: 38px;
              border-radius: 10px;
              display: inline-block;
              vertical-align: middle;
              object-fit: cover;
            }
            .brand-info {
              display: flex;
              flex-direction: column;
            }
            .brand-title {
              font-size: 16px;
              font-weight: 800;
              color: #111;
              line-height: 1.2;
            }
            .brand-address {
              font-size: 8px;
              color: #6B7280;
              margin-top: 2px;
            }
            .powered-by {
              text-align: right;
            }
            .header-right {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .powered-text { font-size: 8px; color: #9CA3AF; margin-bottom: 2px; }
            .isaii-logo { font-size: 12px; font-weight: 700; color: #111; }
            .header-badge {
              width: 42px;
              height: 42px;
              border-radius: 12px;
              object-fit: contain;
            }
            
            /* Meta Section */
            .meta-section { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px; 
              gap: 18px;
            }
            .sender-details { flex: 0 0 40%; }
            .sender-name { font-size: 13px; font-weight: 700; color: #111; margin-bottom: 5px; }
            .sender-address { font-size: 9px; color: #6B7280; line-height: 1.5; }
            .meta-right { display: flex; align-items: flex-start; justify-content: flex-end; gap: 22px; flex: 1; }
            .invoice-details { text-align: right; }
            .detail-label { font-size: 10px; font-weight: 600; color: ${tableHeaderColor}; margin-bottom: 6px; }
            .detail-row { font-size: 9px; margin-bottom: 3px; }
            .detail-row .label { color: #6B7280; }
            .detail-row .value { font-weight: 600; color: #111; margin-left: 6px; }
            .payment-status { text-align: center; min-width: 96px; }
            .payment-title { font-size: 10px; font-weight: 600; color: ${tableHeaderColor}; margin-bottom: 4px; }
            .payment-label { font-size: 9px; font-weight: 700; color: #111; margin-bottom: 3px; }
            .payment-paid { font-size: 13px; font-weight: 700; color: #111; line-height: 1.1; }
            .payment-total { font-size: 16px; font-weight: 800; color: ${tableHeaderColor}; margin-top: 4px; line-height: 1.1; }
            
            /* Table */
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            thead tr { background-color: ${tableHeaderColor}; }
            th { 
              color: white; 
              padding: 8px 6px; 
              font-size: 8px; 
              text-transform: uppercase; 
              text-align: left; 
              font-weight: 600;
              letter-spacing: 0.3px;
            }
            th.center { text-align: center; }
            th.right { text-align: right; }
            td { padding: 8px 6px; font-size: 9px; border-bottom: 1px solid #E5E7EB; }
            
            /* Summary */
            .summary-section { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px;
              padding-bottom: 15px;
            }
            .summary-left { max-width: 50%; }
            .supply-label { font-size: 9px; color: #1F2937; font-weight: 600; margin-bottom: 3px; }
            .supply-value { font-size: 9px; color: #6B7280; margin-bottom: 8px; }
            .words-label { font-size: 9px; font-weight: 600; color: #111; margin-top: 10px; margin-bottom: 3px; }
            .words-value { font-size: 10px; color: ${tableHeaderColor}; font-weight: 500; }
            
            .summary-right { text-align: right; min-width: 200px; }
            .sum-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 6px;
              padding: 3px 0;
            }
            .sum-label { font-size: 9px; color: #6B7280; }
            .sum-value { font-size: 9px; font-weight: 600; color: #111; }
            .total-row { 
              margin-top: 8px; 
              padding-top: 8px; 
              border-top: 1px solid #E5E7EB; 
            }
            .total-row .sum-label { font-size: 11px; font-weight: 700; color: #111; }
            .total-row .sum-value { font-size: 13px; font-weight: 700; color: ${tableHeaderColor}; }
            
            /* Footer */
            .footer { 
              display: flex; 
              gap: 20px; 
              border-top: 1px dashed #E5E7EB; 
              padding-top: 15px; 
            }
            .footer-col { flex: 1; }
            .footer-title { 
              font-size: 10px; 
              font-weight: 700; 
              color: #111; 
              margin-bottom: 6px; 
            }
            .footer-text { 
              font-size: 8px; 
              color: #6B7280; 
              line-height: 1.4; 
              margin-bottom: 6px; 
            }
            .footer-bold { font-weight: 700; }
            
            .bank-details { 
              background-color: #F9FAFB; 
              padding: 12px; 
            
            .bank-details { 
              background-color: #F9FAFB; 
              padding: 10px; 
              border-radius: 6px; 
            }
            .bank-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 3px; 
              font-size: 8px;
            }
            .bank-label { color: #6B7280; }
            .bank-value { font-weight: 600; color: #111; }
            .upi-row { margin-top: 6px; padding-top: 6px; border-top: 1px solid #E5E7EB; }
            .upi-label { font-size: 8px; color: #6B7280; }
            .upi-value { font-size: 8px; font-weight: 600; color: #111; }
            .qr-code-wrapper {
              width: 130px;
              height: 130px;
              margin-top: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              border: 1px solid #E5E7EB;
              padding: 4px;
              overflow: hidden;
            }
            .qr-code-img {
              width: 122px;
              height: 122px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            
            <!-- Header -->
            <div class="header">
              <div class="brand-logo">
                ${brandLogoBase64 ? `<img src="${brandLogoBase64}" alt="Shop Logo" class="logo-icon" />` : '<span class="logo-icon"></span>'}
                <div class="brand-info">
                  <div class="brand-title">${shopName}</div>
                  <div class="brand-address">
                    ${shopLocation}
                    ${shopPhone ? `<br>Phone: ${shopPhone}` : ''}
                    ${showGSTUIN && shopGstin ? `<br>GST: ${shopGstin}` : ''}
                  </div>
                </div>
              </div>
              <div class="header-right">
                <div class="powered-by">
                  <div class="powered-text">Powered by</div>
                  <div class="isaii-logo">${poweredByName}</div>
                  <div class="powered-text">${poweredByPhone}</div>
                </div>
                ${homeBadgeBase64 ? `<img src="${homeBadgeBase64}" alt="Home Badge" class="header-badge" />` : '<div class="header-badge"></div>'}
              </div>
            </div>
            
            <!-- Meta Section -->
            <div class="meta-section">
              <div class="sender-details">
                <div class="detail-label" style="text-align: left;">Issued to:</div>
                <div class="sender-name">${invoice.clientInfo?.name || 'Customer Name'}</div>
                <div class="sender-address">
                  ${invoice.clientInfo?.phone ? `Phone: ${invoice.clientInfo.phone}` : ''}
                  ${invoice.clientInfo?.email ? `<br>Email: ${invoice.clientInfo.email}` : ''}
                  ${invoice.clientInfo?.address ? `<br>${invoice.clientInfo.address}` : ''}
                  ${invoice.clientInfo?.gstNo ? `<br>GST: ${invoice.clientInfo.gstNo}` : ''}
                </div>
              </div>
              
              <div class="meta-right">
                <div class="invoice-details">
                  <div class="detail-label">Invoice Details:</div>
                  <div class="detail-row">
                    <span class="label">Invoice #:</span>
                    <span class="value">${invoice.number}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Invoice Date:</span>
                    <span class="value">${invoice.invoiceDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Due Date:</span>
                    <span class="value">${invoice.dueDate}</span>
                  </div>
                </div>
                <div class="payment-status">
                  <div class="payment-title">Payment Received</div>
                  <div class="payment-label">Paid Amount</div>
                  <div class="payment-paid">${paidAmount}</div>
                  
                </div>
              </div>
            </div>
            
            <!-- Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 35%;">Item/Service Description</th>
                  <th class="center" style="width: 8%;">Qty.</th>
                  <th class="center" style="width: 8%;">GST</th>
                  <th class="right" style="width: 14%;">Taxable<br>Amount</th>
                  <th class="center" style="width: 10%;">SGST</th>
                  <th class="center" style="width: 10%;">CGST</th>
                  <th class="right" style="width: 15%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
            
            <!-- Summary -->
            <div class="summary-section">
              <div class="summary-left">
                <div class="supply-label">Country of supply: <span style="font-weight: 400; color: #6B7280;">India</span></div>
                <div class="supply-label">Place of supply: <span style="font-weight: 400; color: #6B7280;">${shopCity}</span></div>
                
                <div class="words-label">Invoice Total In Words:</div>
                <div class="words-value">${amountInWords}</div>
              </div>
              
              <div class="summary-right">
                <div class="sum-row">
                  <span class="sum-label">Sub Total</span>
                  <span class="sum-value">₹${subTotal}</span>
                </div>
                <div class="sum-row">
                  <span class="sum-label">Taxable Amount</span>
                  <span class="sum-value">₹${taxableAmount}</span>
                </div>
                ${parseFloat(tax) > 0 ? `
                <div class="sum-row">
                  <span class="sum-label">SGST</span>
                  <span class="sum-value">₹${sgst}</span>
                </div>
                <div class="sum-row">
                  <span class="sum-label">CGST</span>
                  <span class="sum-value">₹${cgst}</span>
                </div>
                ` : ''}
                ${invoice.customCharges && invoice.customCharges.length > 0 ? invoice.customCharges.map(charge => `
                <div class="sum-row">
                  <span class="sum-label">${charge.heading}</span>
                  <span class="sum-value">₹${charge.amount.toFixed(2)}</span>
                </div>
                `).join('') : ''}
                ${invoice.additionalFees && invoice.additionalFees.length > 0 ? invoice.additionalFees.map(fee => `
                <div class="sum-row">
                  <span class="sum-label">${fee.name}</span>
                  <span class="sum-value">₹${fee.amount.toFixed(2)}</span>
                </div>
                `).join('') : ''}
                <div class="sum-row total-row">
                  <span class="sum-label">Total Due</span>
                  <span class="sum-value">₹${totalAmount}</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-col">
                <div class="footer-title">Terms and Conditions</div>
                <div class="footer-text">1.Goods once sold are not returnable or refundable unless defective at the time of purchase..</div>
                <div class="footer-text">2.Payment must be made as per the due date mentioned in the invoice; late payments may incur additional charges.</div>
                
                <div class="footer-title" style="margin-top: 12px;">Additional Notes</div>
                <div class="footer-text">Please verify items and quantities upon receipt; report discrepancies within 48 hours.
Keep the invoice for warranty/service reference and future communication.</div>
                
                <div class="footer-text footer-bold" style="margin-top: 8px;">
                  For any enquiries, email us on isaii.dev3@gmail.com or call us on +91 9876543210
                </div>
              </div>
              
              ${hasPaymentDetails ? `<div class="footer-col">
                <div class="footer-title">Bank & Payment Details</div>
                <div class="bank-details">
                  ${paymentRows}
                  ${paymentDetails?.upiId || (showQRCode && qrCodeBase64) ? `<div class="upi-row">
                    ${paymentDetails?.upiId ? `<div class="upi-label">UPI:</div><div class="upi-value">${paymentDetails.upiId}</div>` : ''}
                    ${showQRCode && qrCodeBase64 ? `<div class="upi-label" style="margin-top: 4px;">Payment QR - Scan & Pay</div><div class="qr-code-wrapper"><img src="${qrCodeBase64}" alt="Payment QR Code" class="qr-code-img" /></div>` : ''}
                  </div>` : ''}
                </div>
              </div>` : ''}
            </div>
            
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async (): Promise<void> => {
    try {
      if (!invoice) return;

      const brandLogoBase64 = await getBrandLogoBase64();
      const homeBadgeBase64 = await getHomeBadgeBase64();
      const qrCodeBase64 = await getQrCodeBase64(invoice.total || invoice.grandTotal || 0);

      // Generate HTML from the invoice data (same design as preview)
      const html = generateInvoiceHtml(invoice, brandLogoBase64, homeBadgeBase64, qrCodeBase64);

      // Directly print the invoice
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print invoice.');
    }
  };

  const handleDownload = async (): Promise<void> => {
    try {
      if (!invoice) return;

      // Request media library permissions with write access
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant storage access to save the invoice.');
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Creating PDF',
        text2: 'Please wait...',
        position: 'bottom',
      });

      const brandLogoBase64 = await getBrandLogoBase64();
      const homeBadgeBase64 = await getHomeBadgeBase64();
      const qrCodeBase64 = await getQrCodeBase64(invoice.total || invoice.grandTotal || 0);

      // Generate HTML from the invoice data and create PDF
      const html = generateInvoiceHtml(invoice, brandLogoBase64, homeBadgeBase64, qrCodeBase64);
      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      // Create a filename for the PDF with proper extension
      const fileName = `Invoice_${invoice.number}_${new Date().getTime()}.pdf`;
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

      // Ensure the file has .pdf extension and copy to document directory
      await FileSystem.copyAsync({
        from: pdfUri,
        to: downloadPath
      });

      // Verify file exists and has content
      const fileInfo = await FileSystem.getInfoAsync(downloadPath);
      console.log('PDF file info:', fileInfo);

      // Save to phone's gallery/photos with proper PDF extension
      try {
        const asset = await MediaLibrary.createAssetAsync(downloadPath);

        // Try to create album or add to existing album
        try {
          await MediaLibrary.createAlbumAsync('Viveha Invoices', asset, false);
        } catch (albumError) {
          // Album might already exist, try adding to it
          const album = await MediaLibrary.getAlbumAsync('Viveha Invoices');
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        }
      } catch (mediaError) {
        console.error('Media library error:', mediaError);
        // If saving to media library fails, at least we have the file in cache
      }

      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Invoice Downloaded',
        text2: 'PDF saved successfully',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('Download error:', error);

      // Provide more specific error message
      let errorMessage = 'Failed to download invoice.';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Storage permission is required to save the invoice.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = `Failed to download invoice: ${error.message}`;
        }
      }

      Alert.alert('Download Error', errorMessage);
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      if (!invoice) return;

      const brandLogoBase64 = await getBrandLogoBase64();
      const homeBadgeBase64 = await getHomeBadgeBase64();
      const qrCodeBase64 = await getQrCodeBase64(invoice.total || invoice.grandTotal || 0);

      // Generate HTML from the invoice data and create PDF
      const html = generateInvoiceHtml(invoice, brandLogoBase64, homeBadgeBase64, qrCodeBase64);
      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      // Share the PDF
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf'
      });
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
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('InvoiceCustomization')}
          >
            <Ionicons name={"create-outline" as any} size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerEmpty}>
          <Text>No invoice data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedTotal = invoice.total || invoice.totalAmount || invoice.grandTotal || 0;
  const totalAmount = resolvedTotal.toFixed(2);
  const paidAmount = (invoice.paidAmount || 0).toFixed(2);
  const amountWords = numberToWords(parseFloat(totalAmount));
  const shopAddressParts = [shopDetails?.location, shopDetails?.city, shopDetails?.state].filter(Boolean);
  const senderLines = [
    shopAddressParts.join(', '),
    shopDetails?.phoneNumber || shopDetails?.mobile ? `Phone: ${shopDetails?.phoneNumber || shopDetails?.mobile}` : '',
    showGSTUIN && shopDetails?.gstin ? `GST: ${shopDetails.gstin}` : '',
  ].filter(Boolean);
  const paymentRows = [
    paymentDetails?.bankName ? { label: 'Bank:', value: paymentDetails.bankName } : null,
    paymentDetails?.accountNumber ? { label: 'Account Number:', value: paymentDetails.accountNumber } : null,
    paymentDetails?.ifscCode ? { label: 'IFSC:', value: paymentDetails.ifscCode } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const generatedUpiQrUrl = paymentDetails?.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${paymentDetails.upiId.trim()}&pn=${(shopDetails?.shopName || 'Viveha').trim()}&am=${totalAmount}&cu=INR&mc=0000`)}`
    : '';
  const invoiceQrPreviewUrl = (paymentDetails?.paymentQrUrl && !qrImageLoadFailed)
    ? paymentDetails.paymentQrUrl
    : generatedUpiQrUrl;
  const hasPaymentDetails = Boolean(paymentRows.length || paymentDetails?.upiId || (showQRCode && invoiceQrPreviewUrl));

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
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('InvoiceCustomization')}
        >
          <Ionicons name={"create-outline" as any} size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true} bounces={true}>

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
        <View ref={invoiceRef} collapsable={false} style={styles.invoicePaper}>

          {/* Brand Header */}
          <View style={styles.paperHeader}>
            <View style={styles.headerBrandWrapper}>
              <View style={styles.brandContainer}>
                <Image
                  source={shopDetails?.profileImage ? { uri: shopDetails.profileImage } : require('../assets/logo2.png')}
                  style={styles.brandIcon}
                  resizeMode={shopDetails?.profileImage ? 'cover' : 'contain'}
                />
                <View style={styles.brandInfoWrapper}>
                  <Text style={styles.brandName}>{shopDetails?.shopName || 'viveha.ai'}</Text>
                  {senderLines.length > 0 && (
                    <Text style={styles.brandAddress}>{senderLines.join('\n')}</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.paperHeaderRight}>
              <View style={styles.poweredByContainer}>
                <Text style={styles.poweredLabel}>Powered by</Text>
                <Text style={styles.poweredName}>{poweredByName}</Text>
                <Text style={styles.poweredId}>{poweredByPhone}</Text>
              </View>
              <Image source={require('../assets/Home3.png')} style={styles.headerBadge} resizeMode="contain" />
            </View>
          </View>

          {/* Sender & Invoice Info */}
          <View style={styles.metaRow}>
            <View style={styles.senderSection}>
              <Text style={[styles.metaLabel, { color: headerColor }]}>Issued to:</Text>
              <Text style={styles.senderName}>{invoice.clientInfo?.name || 'Customer Name'}</Text>
              <Text style={styles.senderAddress}>
                {invoice.clientInfo?.phone ? `Phone: ${invoice.clientInfo.phone}` : ''}
                {invoice.clientInfo?.email ? `\nEmail: ${invoice.clientInfo.email}` : ''}
                {invoice.clientInfo?.address ? `\n${invoice.clientInfo.address}` : ''}
                {invoice.clientInfo?.gstNo ? `\nGST: ${invoice.clientInfo.gstNo}` : ''}
              </Text>
            </View>

            <View style={styles.invoiceMetaSection}>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: headerColor }]}>Invoice Details:</Text>
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
              <View style={styles.metaColRight}>
                <Text style={[styles.metaLabel, { color: headerColor }]}>Payment Received</Text>
                <Text style={styles.paymentLabel}>Paid Amount</Text>
                <Text style={styles.paidZero}>{paidAmount}</Text>
                {/* <Text style={[styles.bigAmount, { color: headerColor }]}>₹{totalAmount}</Text> */}
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
              <Text style={[styles.wordsText, { color: headerColor }]}>{amountWords}</Text>
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
                <Text style={[styles.totalDueValue, { color: headerColor }]}>₹{totalAmount}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.paperFooter}>
            <View style={styles.termsCol}>
              <Text style={styles.footerTitle}>Terms and Conditions</Text>
              <Text style={styles.legalText}>1.Goods once sold are not returnable or refundable unless defective at the time of purchase.</Text>
              <Text style={styles.legalText}>2.Payment must be made as per the due date mentioned in the invoice; late payments may incur additional charges.</Text>

              <Text style={[styles.footerTitle, { marginTop: 10 }]}>Additional Notes</Text>
              <Text style={styles.legalText}>Please verify items and quantities upon receipt; report discrepancies within 48 hours.
              Keep the invoice for warranty/service reference and future communication.</Text>

              <Text style={[styles.legalText, { marginTop: 10, fontWeight: 'bold' }]}>For any enquiries, email us on isaii.dev3@gmail.com or call us on +91 9876543210</Text>
            </View>

            {hasPaymentDetails && (
              <View style={styles.bankCol}>
                <Text style={styles.footerTitle}>Bank & Payment Details</Text>
                {paymentRows.map((row) => (
                  <View key={row.label} style={styles.bankRow}><Text style={styles.lbl}>{row.label}</Text><Text style={[styles.val, { flex: 1, textAlign: 'right' }]}>{row.value}</Text></View>
                ))}

                {paymentDetails?.upiId ? (
                  <View style={styles.ubiRow}>
                    <Text style={styles.lbl}>UPI:</Text>
                    <Text style={[styles.val, { flex: 1, textAlign: 'right' }]}>{paymentDetails.upiId}</Text>
                  </View>
                ) : null}
                {showQRCode && invoiceQrPreviewUrl ? (
                  <>
                    <Text style={[styles.lbl, { marginTop: 4 }]}>Payment QR - Scan & Pay</Text>
                    <View style={styles.qrPlaceholder}>
                      <Image
                        source={{ uri: invoiceQrPreviewUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                        onError={() => {
                          if (paymentDetails?.paymentQrUrl) setQrImageLoadFailed(true);
                        }}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            )}
          </View>

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.savePrintBtn} onPress={handlePrint}>
          <Ionicons name={"print-outline" as any} size={20} color="#fff" />
          <Text style={styles.btnText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleDownload}>
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

  scrollContent: { paddingBottom: 20, flexGrow: 1 },

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
  paperHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBrandWrapper: { flex: 1.8, paddingRight: 10 },
  brandContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  brandIcon: { width: 38, height: 38, borderRadius: 10, marginTop: 2 },
  brandInfoWrapper: { flex: 1 },
  brandName: { fontSize: 13, fontWeight: '800', color: '#111', lineHeight: 16 },
  brandAddress: { fontSize: 8, color: '#6B7280', marginTop: 2, lineHeight: 12 },
  paperHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  poweredByContainer: { alignItems: 'flex-end' },
  poweredLabel: { fontSize: 9, color: '#9CA3AF', textAlign: 'right' },
  poweredName: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'right' },
  poweredId: { fontSize: 9, color: '#9CA3AF', textAlign: 'right' },
  headerBadge: { width: 42, height: 42, borderRadius: 12 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  senderSection: { flex: 0.35, paddingRight: 10 },
  senderName: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 4 },
  senderAddress: { fontSize: 9, color: '#4B5563', lineHeight: 14 },

  invoiceMetaSection: { flex: 0.65, flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: {},
  metaColRight: { alignItems: 'center', minWidth: 96 },
  metaLabel: { fontSize: 9, fontWeight: '700', color: '#3B82F6', marginBottom: 6 },
  metaPair: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, gap: 5 },
  subLabel: { fontSize: 9, color: '#6B7280' },
  subValue: { fontSize: 9, fontWeight: '600', color: '#111' },
  paymentLabel: { fontSize: 9, fontWeight: '700', color: '#111', marginBottom: 4 },
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
  qrPlaceholder: {
    marginTop: 4,
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  qrImage: { width: 122, height: 122 },

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
