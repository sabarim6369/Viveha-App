import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  text1?: string;
  text2?: string;
}

export const CustomToastConfig = {
  success: ({ text1, text2 }: ToastProps) => (
    <View style={[styles.toastContainer, styles.successToast]}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        {text1 && <Text style={styles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
    </View>
  ),
  
  error: ({ text1, text2 }: ToastProps) => (
    <View style={[styles.toastContainer, styles.errorToast]}>
      <View style={styles.iconContainer}>
        <Ionicons name="close-circle" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        {text1 && <Text style={styles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
    </View>
  ),
  
  info: ({ text1, text2 }: ToastProps) => (
    <View style={[styles.toastContainer, styles.infoToast]}>
      <View style={styles.iconContainer}>
        <Ionicons name="information-circle" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        {text1 && <Text style={styles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
    </View>
  ),
  
  warning: ({ text1, text2 }: ToastProps) => (
    <View style={[styles.toastContainer, styles.warningToast]}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        {text1 && <Text style={styles.toastTitle}>{text1}</Text>}
        {text2 && <Text style={styles.toastMessage}>{text2}</Text>}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  successToast: {
    backgroundColor: '#3B82F6', // Viveha primary blue
  },
  errorToast: {
    backgroundColor: '#EF4444', // Viveha red
  },
  infoToast: {
    backgroundColor: '#6366F1', // Viveha secondary purple-blue
  },
  warningToast: {
    backgroundColor: '#F59E0B', // Amber/orange for warnings
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.95,
  },
});
