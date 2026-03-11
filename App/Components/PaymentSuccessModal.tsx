import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

interface PaymentSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  invoiceNumber: string;
  paidAmount: number;
  remainingAmount: number;
}

const { width } = Dimensions.get('window');

export default function PaymentSuccessModal({
  visible,
  onClose,
  customerName,
  invoiceNumber,
  paidAmount,
  remainingAmount,
}: PaymentSuccessModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Success Card */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              {/* Customer Name */}
              <Text style={styles.customerName}>{customerName}</Text>
              
              {/* Invoice Number */}
              <Text style={styles.invoiceNumber}>
                Invoice No.: {invoiceNumber}
              </Text>
              
              {/* Amount Details */}
              <View style={styles.amountRow}>
                <View style={styles.amountColumn}>
                  <Text style={styles.amountLabel}>Paid</Text>
                  <Text style={styles.paidAmount}>Rs. {paidAmount.toFixed(2)}</Text>
                </View>
                <View style={[styles.amountColumn, styles.amountColumnRight]}>
                  <Text style={styles.amountLabel}>Remaining</Text>
                  <Text style={styles.remainingAmount}>Rs. {remainingAmount.toFixed(2)}</Text>
                </View>
              </View>
              
              {/* Back to Home Button */}
              <TouchableOpacity 
                style={styles.button}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    padding: 24,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  amountColumn: {
    flex: 1,
  },
  amountColumnRight: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  paidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#FF7A59',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
