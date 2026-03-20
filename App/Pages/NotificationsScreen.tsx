import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    FlatList,
    ActivityIndicator
} from "react-native";

import { SwipeListView } from "react-native-swipe-list-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
    getReminderNotifications,
    deleteReminder,
    deleteAllReminders,
    markReminderAsRead
} from "../utils/NetworkManager";

export default function NotificationsScreen({ navigation }) {

    const insets = useSafeAreaInsets();

    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);



    const loadNotifications = async () => {
        setIsLoading(true);
        try {

            const reminders = await getReminderNotifications();

            const formatted = reminders.map(r => ({
                id: r.id,
                type: r.type,
                title: r.title,
                message: r.message,
                amount: r.amount,
                timestamp: new Date(r.timestamp).toISOString(),
                read: r.read
            }));

            formatted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setNotifications(formatted);

        } catch (e) {
            console.log(e);
        } finally {
            setIsLoading(false);
        }
    };



    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };



    const handleDeleteNotification = async (id) => {

        try {

            await deleteReminder(id);

            setNotifications(prev =>
                prev.filter(n => n.id !== id)
            );

        } catch (e) {
            console.log(e);
        }

    };



    const markAsRead = async (id) => {

        try {

            await markReminderAsRead(id);

            setNotifications(prev =>
                prev.map(n =>
                    n.id === id ? { ...n, read: true } : n
                )
            );

        } catch (e) {
            console.log(e);
        }

    };



    const markAllRead = async () => {

        await deleteAllReminders();

        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );

    };

    // Selection functions
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedItems(new Set());
    };

    const toggleItemSelection = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const deleteSelectedItems = async () => {
        try {
            for (const itemId of Array.from(selectedItems)) {
                await deleteReminder(itemId as string);
            }
            setNotifications(prev => prev.filter(n => !selectedItems.has(n.id)));
            setSelectedItems(new Set());
            setSelectionMode(false);
        } catch (e) {
            console.log(e);
        }
    };

    const selectAllItems = () => {
        if (selectedItems.size === notifications.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(notifications.map(n => n.id)));
        }
    };



    const getNotificationIcon = (type) => {

        switch (type) {

            case 'alert':
                return { icon: 'warning', color: '#FFA500' };

            case 'payment':
                return { icon: 'alert-circle', color: '#FF4D4F' };

            case 'success':
                return { icon: 'checkmark-circle', color: '#34C759' };

            default:
                return { icon: 'alert-circle', color: '#FF4D4F' };
        }

    };



    const getTimeAgo = (timestamp) => {

        const now = new Date();
        const then = new Date(timestamp);

        const diff = (now.getTime() - then.getTime()) / 1000;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    {selectionMode ? `${selectedItems.size} selected` : 'Notifications'}
                </Text>

                {selectionMode ? (
                    <View style={styles.selectionActions}>
                        <TouchableOpacity onPress={selectAllItems} style={styles.selectAllButton}>
                            <Text style={styles.selectAllText}>
                                {selectedItems.size === notifications.length ? 'Deselect All' : 'Select All'}
                            </Text>
                        </TouchableOpacity>
                        {selectedItems.size > 0 && (
                            <TouchableOpacity onPress={deleteSelectedItems} style={styles.deleteButton}>
                                <Ionicons name="trash" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAll}>Mark all as{'\n'}read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* NOTIFICATIONS LIST */}
            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#5B7CFF" />
                    <Text style={styles.loaderText}>Loading notifications...</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={[
                        styles.listContent,
                        notifications.length === 0 && styles.emptyListContent
                    ]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={48} color="#B8C0D4" />
                            <Text style={styles.emptyStateTitle}>No notification</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const icon = getNotificationIcon(item.type);
                        const isSelected = selectedItems.has(item.id);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (selectionMode) {
                                        toggleItemSelection(item.id);
                                    } else {
                                        markAsRead(item.id);
                                    }
                                }}
                                onLongPress={() => {
                                    if (!selectionMode) {
                                        setSelectionMode(true);
                                        toggleItemSelection(item.id);
                                    }
                                }}
                                style={[
                                    styles.card,
                                    !item.read && styles.unreadCard,
                                    isSelected && styles.selectedCard
                                ]}
                            >
                                {/* Checkbox for selection mode */}
                                {selectionMode && (
                                    <View style={styles.checkbox}>
                                        <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
                                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                        </View>
                                    </View>
                                )}
                                <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
                                    <Ionicons name={icon.icon} size={22} color={icon.color} />
                                </View>

                                <View style={styles.content}>
                                    <View style={styles.titleRow}>
                                        <Text style={styles.title}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.time}>
                                            {getTimeAgo(item.timestamp)}
                                        </Text>
                                    </View>

                                    <Text style={styles.message}>
                                        {item.message}
                                    </Text>

                                    {item.amount &&
                                        <Text style={styles.amount}>
                                            ₹{item.amount.toFixed(2)}
                                        </Text>
                                    }
                                </View>

                                {!item.read && !selectionMode && <View style={styles.unreadDot} />}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#F5F6FA"
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 14
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111"
    },

    markAll: {
        fontSize: 12,
        color: "#5B7CFF",
        fontWeight: "600",
        textAlign: "center"
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 10,
        flexDirection: "row",
        marginBottom: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2
    },

    unreadCard: {
        backgroundColor: "#EEF3FF"
    },

    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12
    },

    content: {
        flex: 1
    },

    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },

    title: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111",
        flex: 1
    },

    time: {
        fontSize: 11,
        color: "#aaa"
    },

    message: {
        fontSize: 13,
        color: "#777",
        marginTop: 4,
        lineHeight: 18
    },

    amount: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: "700",
        color: "#111"
    },

    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#5B7CFF",
        marginLeft: 8
    },

    selectionActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },

    selectAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#5B7CFF",
        borderRadius: 6
    },

    selectAllText: {
        fontSize: 12,
        color: "#5B7CFF",
        fontWeight: "600"
    },

    deleteButton: {
        backgroundColor: "#FF4D4F",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center"
    },

    normalActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },

    selectedCard: {
        backgroundColor: "#F0F8FF",
        borderWidth: 2,
        borderColor: "#5B7CFF"
    },

    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#5B7CFF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12
    },

    checkboxInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center"
    },

    checkboxChecked: {
        backgroundColor: "#5B7CFF"
    },

    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100
    },

    loaderText: {
        marginTop: 16,
        fontSize: 14,
        color: "#777",
        fontWeight: "500"
    },

    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24
    },

    emptyListContent: {
        flexGrow: 1,
        justifyContent: "center"
    },

    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24
    },

    emptyStateTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: "700",
        color: "#111"
    }

});