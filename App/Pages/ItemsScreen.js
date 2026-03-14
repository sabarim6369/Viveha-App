import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Footer from '../Components/Footer';
import SyncIndicator from '../Components/SyncIndicator';
import {
  useNetworkStatus,
  saveItem,
  deleteItem,
  getItems,
  getPendingSyncByType,
  syncWithServer,
  getItemGroups,
  createItemGroupInBackend,
  updateItemGroupInBackend,
  deleteItemGroupInBackend,
  saveLocalData,
  STORAGE_KEYS,
  getDealers,
} from '../utils/NetworkManager';

const ITEMS_STORAGE_KEY = '@viveha_items';
// GROUPS_STORAGE_KEY removed as we use NetworkManager constants

export default function ItemsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupSelectorVisible, setGroupSelectorVisible] = useState(false);
  const [dealerSelectorVisible, setDealerSelectorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    stock: '',
    groupId: null,
    groupName: '',
    dealerId: null,
    dealerName: '',
    purchasePrice: '',
  });
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadItems();
    loadGroups();
    loadDealers();
    updatePendingCount();
  }, []);

  // Monitor network status and sync when online
  useEffect(() => {
    if (isConnected && isInternetReachable) {
      checkAndSync();
    }
  }, [isConnected, isInternetReachable]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const loadedItems = await getItems();
      setItems(loadedItems);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const loadedGroups = await getItemGroups();
      setGroups(loadedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadDealers = async () => {
    try {
      const loadedDealers = await getDealers();
      setDealers(loadedDealers);
    } catch (error) {
      console.error('Error loading dealers:', error);
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

      // Reload groups if we synced, just in case
      loadGroups();

      if (result.synced > 0) {
        Toast.show({
          type: 'success',
          text1: 'Sync Complete',
          text2: `${result.synced} items synced successfully!`,
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } else {
      /*
      Toast.show({
        type: 'error',
        text1: 'Sync Failed',
        text2: 'Could not sync data. Will retry when online.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      */
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ 
      name: '', 
      amount: '', 
      stock: '', 
      groupId: null, 
      groupName: '',
      dealerId: null,
      dealerName: '',
      purchasePrice: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    // Get dealerId from dealerIds array or fallback to dealerId field
    const dealerId = (item.dealerIds && item.dealerIds.length > 0) ? item.dealerIds[0] : item.dealerId;
    const dealer = dealers.find(d => d.id === dealerId || d.serverId === dealerId || d._id === dealerId);
    setFormData({
      name: item.name,
      amount: item.amount.toString(),
      stock: item.stock.toString(),
      groupId: item.groupId || null,
      groupName: item.groupName || '',
      dealerId: dealerId || null,
      dealerName: dealer ? (dealer.businessName || dealer.name) : '',
      purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '',
    });
    setModalVisible(true);
  };

  const openGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({ name: '', description: '' });
    setGroupModalVisible(true);
  };

  const openEditGroupModal = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description,
    });
    setGroupModalVisible(true);
  };

  const handleSaveItem = async () => {
    // Validation
    if (!formData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter item name',
        position: 'bottom',
      });
      return;
    }
    if (!formData.groupId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a group',
        position: 'bottom',
      });
      return;
    }
    if (!formData.dealerId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a dealer',
        position: 'bottom',
      });
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter valid amount',
        position: 'bottom',
      });
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter valid stock quantity',
        position: 'bottom',
      });
      return;
    }

    const newItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      serverId: editingItem?.serverId, // Keep the server ID for updates
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      stock: parseInt(formData.stock),
      groupId: formData.groupId,
      groupName: formData.groupName,
      dealerId: formData.dealerId || null,
      dealerIds: formData.dealerId ? [formData.dealerId] : [],
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
    };

    // Save using offline support
    const result = await saveItem(newItem, !!editingItem);

    if (result.success) {
      setItems(result.items);
      setModalVisible(false);
      setFormData({ name: '', amount: '', stock: '' });

      const offlineMsg = (!isConnected || !isInternetReachable) ? ' (Saved offline)' : '';
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Item ${editingItem ? 'updated' : 'added'} successfully!${offlineMsg}`,
        position: 'bottom',
      });

      await updatePendingCount();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save item. Please try again.',
        position: 'bottom',
      });
    }
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
          onPress: async () => {
            const result = await deleteItem(itemId);

            if (result.success) {
              setItems(result.items);

              const offlineMsg = (!isConnected || !isInternetReachable) ? ' (Deleted offline)' : '';
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: `Item deleted!${offlineMsg}`,
                position: 'bottom',
              });

              await updatePendingCount();
            } else {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete item. Please try again.',
                position: 'bottom',
              });
            }
          },
        },
      ]
    );
  };

  const handleSaveGroup = async () => {
    // Validation
    const trimmedName = groupFormData.name.trim();

    if (!trimmedName) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a group name',
        position: 'bottom',
      });
      return;
    }

    // Check for minimum length
    if (trimmedName.length < 2) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Group name must be at least 2 characters',
        position: 'bottom',
      });
      return;
    }

    // Check for duplicate names (case-insensitive)
    const duplicateExists = groups.some(g =>
      g.id !== editingGroup?.id &&
      g.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      Toast.show({
        type: 'error',
        text1: 'Duplicate Group',
        text2: 'A group with this name already exists',
        position: 'bottom',
      });
      return;
    }

    const groupData = {
      name: trimmedName,
      description: groupFormData.description.trim(),
    };

    let result;
    if (editingGroup) {
      result = await updateItemGroupInBackend(editingGroup.id, groupData);
    } else {
      result = await createItemGroupInBackend(groupData);
    }

    if (result.success) {
      // Refresh groups
      // If we got a group back (creation), we might need to update local state manually if not fetched
      // But best is to reload
      // For smooth UX, let's update local state immediately

      let updatedGroups;
      if (editingGroup) {
        updatedGroups = groups.map(g => g.id === editingGroup.id ? { ...g, ...groupData } : g);
      } else {
        updatedGroups = [...groups, result.group];
      }

      setGroups(updatedGroups);
      await saveLocalData(STORAGE_KEYS.ITEM_GROUPS, updatedGroups);

      setGroupModalVisible(false);
      setEditingGroup(null);
      setGroupFormData({ name: '', description: '' });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Group "${trimmedName}" ${editingGroup ? 'updated' : 'created'} successfully!`,
        position: 'bottom',
        visibilityTime: 2000,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save group',
        position: 'bottom',
      });
    }
  };

  const handleDeleteGroup = (groupId) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? Items in this group will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteItemGroupInBackend(groupId);

            if (result.success) {
              const updatedGroups = groups.filter(g => g.id !== groupId);
              setGroups(updatedGroups);
              await saveLocalData(STORAGE_KEYS.ITEM_GROUPS, updatedGroups);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Group deleted successfully!',
                position: 'bottom',
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete group',
                position: 'bottom',
              });
            }
          },
        },
      ]
    );
  };

  const handleSelectGroup = (group) => {
    setFormData({
      ...formData,
      groupId: group.id,
      groupName: group.name,
    });
    setGroupSelectorVisible(false);
  };

  const handleClearGroup = () => {
    setFormData({
      ...formData,
      groupId: null,
      groupName: '',
    });
  };

  const handleSelectDealer = (dealer) => {
    const dealerId = dealer._id || dealer.id || dealer.serverId;
    setFormData({
      ...formData,
      dealerId: dealerId,
      dealerName: dealer.businessName || dealer.name,
    });
    setDealerSelectorVisible(false);
  };

  const handleClearDealer = () => {
    setFormData({
      ...formData,
      dealerId: null,
      dealerName: '',
      purchasePrice: '',
    });
  };

  return (
    <View style={styles.container}>
      {/* Sync Indicator */}
      <SyncIndicator
        isOnline={isConnected && isInternetReachable}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Items</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.groupButton}
            onPress={openGroupModal}
          >
            <Ionicons name="folder-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={28} color="#E88E99" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E88E99" />
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first product to get started
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={openAddModal}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="cube" size={24} color="#E88E99" />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.groupName && (
                      <View style={styles.groupBadge}>
                        <Ionicons name="folder" size={12} color="#666" />
                        <Text style={styles.groupBadgeText}>{item.groupName}</Text>
                      </View>
                    )}
                    <Text style={styles.itemAmount}>Rs.{(item.amount || 0).toFixed(2)}</Text>
                    <Text style={[
                      styles.itemStock,
                      item.stock === 0 && styles.outOfStock
                    ]}>
                      Stock: {item.stock} {item.stock === 0 ? '(Out of Stock)' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Item Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter item name"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Group <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.groupSelector}
                    onPress={() => setGroupSelectorVisible(true)}
                  >
                    <View style={styles.groupSelectorContent}>
                      {formData.groupName ? (
                        <>
                          <Ionicons name="folder" size={20} color="#E88E99" />
                          <Text style={styles.groupSelectorText}>{formData.groupName}</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="folder-outline" size={20} color="#999" />
                          <Text style={styles.groupSelectorPlaceholder}>Select a group</Text>
                        </>
                      )}
                    </View>
                    {formData.groupName ? (
                      <TouchableOpacity onPress={handleClearGroup}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#999" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Dealer Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dealer <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.groupSelector}
                    onPress={() => setDealerSelectorVisible(true)}
                  >
                    <View style={styles.groupSelectorContent}>
                      {formData.dealerName ? (
                        <>
                          <Ionicons name="storefront" size={20} color="#E88E99" />
                          <Text style={styles.groupSelectorText}>{formData.dealerName}</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="storefront-outline" size={20} color="#999" />
                          <Text style={styles.groupSelectorPlaceholder}>Select a dealer</Text>
                        </>
                      )}
                    </View>
                    {formData.dealerId ? (
                      <TouchableOpacity onPress={handleClearDealer}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#999" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount (Rs.)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter selling price"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })}
                    keyboardType="decimal-pad"
                  />
                </View>

                {formData.dealerId && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Purchase Price (Rs.) *From Dealer</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter dealer purchase price"
                      value={formData.purchasePrice}
                      onChangeText={(text) => setFormData({ ...formData, purchasePrice: text.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Stock Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter stock quantity"
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveItem}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Management Modal */}
      <Modal
        visible={groupModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGroup ? 'Edit Group' : 'Manage Groups'}
              </Text>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.groupModalScroll}>
              {/* Group Form */}
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Group Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Engine Parts"
                    value={groupFormData.name}
                    onChangeText={(text) => setGroupFormData({ ...groupFormData, name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="e.g., All engine-related spare parts and components"
                    value={groupFormData.description}
                    onChangeText={(text) => setGroupFormData({ ...groupFormData, description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveGroup}
                >
                  <Text style={styles.saveButtonText}>
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </Text>
                </TouchableOpacity>

                {editingGroup && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingGroup(null);
                      setGroupFormData({ name: '', description: '' });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Existing Groups List */}
              {groups.length > 0 && (
                <View style={styles.groupsList}>
                  <Text style={styles.sectionTitle}>Existing Groups</Text>
                  {groups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupInfo}>
                        <Ionicons name="folder" size={24} color="#E88E99" />
                        <View style={styles.groupDetails}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          {group.description ? (
                            <Text style={styles.groupDescription}>{group.description}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.groupActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditGroupModal(group)}
                        >
                          <Ionicons name="create-outline" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteGroup(group.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Selector Modal */}
      <Modal
        visible={groupSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGroupSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setGroupSelectorVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.selectorList}>
              {groups.length === 0 ? (
                <View style={styles.emptySelector}>
                  <Ionicons name="folder-outline" size={50} color="#ccc" />
                  <Text style={styles.emptySelectorText}>No groups yet</Text>
                  <TouchableOpacity
                    style={styles.createGroupButton}
                    onPress={() => {
                      setGroupSelectorVisible(false);
                      openGroupModal();
                    }}
                  >
                    <Text style={styles.createGroupButtonText}>Create Group</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.selectorItem,
                      formData.groupId === group.id && styles.selectorItemSelected
                    ]}
                    onPress={() => handleSelectGroup(group)}
                  >
                    <Ionicons
                      name={formData.groupId === group.id ? "folder" : "folder-outline"}
                      size={24}
                      color={formData.groupId === group.id ? "#E88E99" : "#666"}
                    />
                    <View style={styles.selectorItemText}>
                      <Text style={[
                        styles.selectorItemName,
                        formData.groupId === group.id && styles.selectorItemNameSelected
                      ]}>
                        {group.name}
                      </Text>
                      {group.description ? (
                        <Text style={styles.selectorItemDesc}>{group.description}</Text>
                      ) : null}
                    </View>
                    {formData.groupId === group.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#E88E99" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dealer Selector Modal */}
      <Modal
        visible={dealerSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDealerSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dealer</Text>
              <TouchableOpacity onPress={() => setDealerSelectorVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.selectorList}>
              {dealers.length === 0 ? (
                <View style={styles.emptySelector}>
                  <Ionicons name="storefront-outline" size={50} color="#ccc" />
                  <Text style={styles.emptySelectorText}>No dealers yet</Text>
                  <TouchableOpacity
                    style={styles.createGroupButton}
                    onPress={() => {
                      setDealerSelectorVisible(false);
                      navigation.navigate('AddDealer');
                    }}
                  >
                    <Text style={styles.createGroupButtonText}>Add Dealer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                dealers.map((dealer) => {
                  const dealerId = dealer._id || dealer.id || dealer.serverId;
                  return (
                  <TouchableOpacity
                    key={dealerId}
                    style={[
                      styles.selectorItem,
                      formData.dealerId === dealerId && styles.selectorItemSelected
                    ]}
                    onPress={() => handleSelectDealer(dealer)}
                  >
                    <Ionicons
                      name={formData.dealerId === dealerId ? "storefront" : "storefront-outline"}
                      size={24}
                      color={formData.dealerId === dealerId ? "#E88E99" : "#666"}
                    />
                    <View style={styles.selectorItemText}>
                      <Text style={[
                        styles.selectorItemName,
                        formData.dealerId === dealerId && styles.selectorItemNameSelected
                      ]}>
                        {dealer.businessName || dealer.name}
                      </Text>
                      {dealer.phoneNumber ? (
                        <Text style={styles.selectorItemDesc}>{dealer.phoneNumber}</Text>
                      ) : null}
                    </View>
                    {formData.dealerId === dealerId && (
                      <Ionicons name="checkmark-circle" size={24} color="#E88E99" />
                    )}
                  </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Footer activeTab="Home" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupButton: {
    padding: 5,
  },
  addButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E88E99',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    padding: 20,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
    gap: 4,
  },
  groupBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E88E99',
    marginBottom: 2,
  },
  itemStock: {
    fontSize: 12,
    color: '#666',
  },
  outOfStock: {
    color: '#F44336',
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacing: {
    height: 80,
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
    paddingBottom: 40,
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
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#E88E99',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  groupSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  groupSelectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  groupSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  groupModalScroll: {
    maxHeight: '80%',
  },
  groupsList: {
    padding: 20,
    paddingTop: 10,
  },
  groupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  groupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  selectorList: {
    paddingHorizontal: 20,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  selectorItemSelected: {
    backgroundColor: '#FFF3F4',
    borderWidth: 2,
    borderColor: '#E88E99',
  },
  selectorItemText: {
    flex: 1,
  },
  selectorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  selectorItemNameSelected: {
    color: '#E88E99',
  },
  selectorItemDesc: {
    fontSize: 13,
    color: '#666',
  },
  emptySelector: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptySelectorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 20,
  },
  createGroupButton: {
    backgroundColor: '#E88E99',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});