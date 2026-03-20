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

  const total = paidAmount + remainingAmount;
  const progress = (paidAmount / total) * 100;

  return (
    <Modal visible={visible} transparent animationType="fade">

      <View style={styles.overlay}>

        <View style={styles.card}>

          {/* Name */}
          <Text style={styles.customerName}>{customerName}</Text>

          {/* Invoice */}
          <Text style={styles.invoice}>
            Invoice No.: {invoiceNumber}
          </Text>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]}
            />
          </View>

          {/* Amounts */}
          <View style={styles.amountRow}>

            <View>
              <Text style={styles.label}>Paid</Text>
              <Text style={styles.amount}>
                Rs. {paidAmount.toFixed(2)}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Remaining</Text>
              <Text style={styles.amount}>
                Rs. {remainingAmount.toFixed(2)}
              </Text>
            </View>

          </View>

          {/* Button */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>

        </View>

      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  card: {
    width: width * 0.88,
    padding: 26,
    borderRadius: 24,

    /* soft peach gradient look */
    backgroundColor: '#f6ded3',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },

  customerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },

  invoice: {
    fontSize: 15,
    color: '#6b6b6b',
    marginBottom: 18,
  },

  progressTrack: {
    height: 8,
    backgroundColor: '#e4e4e4',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 22,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#f47b3c',
    borderRadius: 10,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },

  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },

  button: {
    backgroundColor: '#f47b3c',
    borderRadius: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

});