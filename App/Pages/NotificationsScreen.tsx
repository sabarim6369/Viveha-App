import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReminderNotifications, updateReminderStatus, deleteReminder, deleteAllReminders } from '../utils/NetworkManager';

interface Notification {
  id: string;
  type: 'reminder' | 'payment' | 'success' | 'alert';
  title: string;
  message: string;
  customerName?: string;
  customerPhone?: string;
  amount?: number;
  timestamp: string;
  read: boolean;
  reminderDate?: string;
}

interface NotificationsScreenProps {
  navigation: any;
}

const STORAGE_KEY = '@viveha_notifications';

export default function NotificationsScreen({ navigation }: NotificationsScreenProps): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (): Promise<void> => {
    try {
      // Fetch from backend API
      const reminders = await getReminderNotifications();
      
      // Convert to notification format
      const formattedNotifications = reminders.map(reminder => ({
        id: reminder.id,
        type: reminder.type,
        title: reminder.title,
        message: reminder.message,
        customerName: reminder.customerName,
        amount: reminder.amount,
        timestamp: new Date(reminder.timestamp).toISOString(),
        read: reminder.read,
        reminderDate: new Date(reminder.reminderDate).toISOString(),
      }));

      // Sort by timestamp (newest first)
      const sorted = formattedNotifications.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setNotifications(sorted);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      // Update in backend
      await updateReminderStatus(notificationId, 'sent');
      
      // Update local state
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      setNotifications(updated);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      // Update all in backend
      const updatePromises = notifications
        .filter(n => !n.read)
        .map(n => updateReminderStatus(n.id, 'sent'));
      
      await Promise.all(updatePromises);
      
      // Update local state
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string): Promise<void> => {
    try {
      const result = await deleteReminder(notificationId);
      
      if (result.success) {
        // Remove from local state
        const updated = notifications.filter(n => n.id !== notificationId);
        setNotifications(updated);
      } else {
        console.error('Failed to delete notification:', result.error);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async (): Promise<void> => {
    try {
      const result = await deleteAllReminders();
      
      if (result.success) {
        // Refresh notifications
        await loadNotifications();
      } else {
        console.error('Failed to clear all notifications:', result.error);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return { name: 'notifications' as any, color: '#EF4444' };
      case 'payment':
        return { name: 'alert-circle' as any, color: '#F59E0B' };
      case 'success':
        return { name: 'checkmark-circle' as any, color: '#10B981' };
      case 'alert':
        return { name: 'warning' as any, color: '#8B5CF6' };
      default:
        return { name: 'information-circle' as any, color: '#3B82F6' };
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={"arrow-back" as any} size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={"notifications-outline" as any} size={80} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>You'll see reminders and updates here</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => {
              const icon = getNotificationIcon(notification.type);
              return (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.unreadCard
                  ]}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationTime}>{getTimeAgo(notification.timestamp)}</Text>
                    </View>
                    
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    
                    {notification.customerName && (
                      <View style={styles.customerInfo}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.customerText}>{notification.customerName}</Text>
                      </View>
                    )}
                    
                    {notification.customerPhone && (
                      <View style={styles.customerInfo}>
                        <Ionicons name="call-outline" size={14} color="#666" />
                        <Text style={styles.customerText}>{notification.customerPhone}</Text>
                      </View>
                    )}
                    
                    {notification.amount !== undefined && (
                      <Text style={styles.notificationAmount}>₹{notification.amount.toFixed(2)}</Text>
                    )}
                    
                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteNotification(notification.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer note */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <Text style={styles.footerText}>
          By continuing, you agree to the Terms of Service and confirm that you have read our Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  clearAllText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  markAllRead: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  customerText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
