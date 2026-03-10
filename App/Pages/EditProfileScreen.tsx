import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import apiurl from '../api';
import { fetchClientProfile } from '../utils/NetworkManager';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps): React.JSX.Element {
  const [shopName, setShopName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showStateDropdown, setShowStateDropdown] = useState<boolean>(false);
  const [stateSearch, setStateSearch] = useState<string>('');

  const indianStates: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const filteredStates = indianStates.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // 1) Try local cached details first for instant UI
        const cached = await AsyncStorage.getItem('@viveha_shop_details');
        if (cached) {
          const details = JSON.parse(cached);
          setShopName(details.shopName || '');
          setLocation(details.location || '');
          setCity(details.city || '');
          setStateName(details.state || '');
          setGstin(details.gstin || '');
        }

        // 2) Fetch fresh profile from backend to keep in sync
        const remote = await fetchClientProfile();
        if (remote) {
          setShopName(remote.shopName || '');
          setLocation(remote.location || '');
          setCity(remote.city || '');
          setStateName(remote.state || '');
          setGstin(remote.gstin || '');
        }
      } catch (error) {
        console.error('Error loading profile for edit:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load profile. Please try again.',
          position: 'bottom',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (): Promise<void> => {
    try {
      if (!shopName.trim() || !location.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Missing details',
          text2: 'Please fill shop name and location.',
          position: 'bottom',
        });
        return;
      }

      setSaving(true);
      const token = await AsyncStorage.getItem('@viveha_token');
      const clientId = await AsyncStorage.getItem('@viveha_client_id');

      if (!token || !clientId) {
        Toast.show({
          type: 'error',
          text1: 'Session expired',
          text2: 'Please login again.',
          position: 'bottom',
        });
        return;
      }

      const payload = {
        ownerName: shopName.trim(),
        businessName: shopName.trim(),
        shopName: shopName.trim(),
        location: location.trim(),
        city: city.trim(),
        state: stateName.trim(),
        gstin: gstin.trim(),
      };

      const url = `${apiurl}/auth/client/${clientId}`;
      console.log('Updating client profile at:', url, 'payload:', payload);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Profile update response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      if (data.client) {
        const updated = {
          shopName: data.client.shopName || data.client.businessName || shopName.trim(),
          location: data.client.location || location.trim(),
          city: data.client.city || city.trim(),
          state: data.client.state || stateName.trim(),
          ownerName: data.client.ownerName || data.client.shopName || data.client.businessName || shopName.trim(),
          phoneNumber: data.client.phoneNumber || '',
          invoiceCount: data.client.invoiceCount || 0,
          profileImage: data.client.profileUrl || '',
          gstin: data.client.gstin || gstin.trim(),
        };
        await AsyncStorage.setItem('@viveha_shop_details', JSON.stringify(updated));
      }

      Toast.show({
        type: 'success',
        text1: 'Profile updated',
        text2: 'Your shop details have been saved.',
        position: 'bottom',
      });

      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: error.message || 'Could not save changes. Please try again.',
        position: 'bottom',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#E88E99" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={"arrow-back" as any} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Business details</Text>
            <Text style={styles.sectionSubtitle}>
              Update the information you shared in &quot;Tell us about your shop&quot;.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Shop name<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Viveha Automobiles"
                placeholderTextColor="#AAA"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Location<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Street address, area, building"
                placeholderTextColor="#AAA"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#AAA"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.label}>State</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowStateDropdown((prev) => !prev);
                    if (!showStateDropdown) {
                      setStateSearch('');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownButtonText,
                      !stateName && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {stateName || 'State'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {showStateDropdown && (
              <View style={styles.dropdownList}>
                <View style={styles.searchContainer}>
                  <Ionicons
                    name="search"
                    size={16}
                    color="#999"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search state..."
                    placeholderTextColor="#999"
                    value={stateSearch}
                    onChangeText={setStateSearch}
                    autoFocus
                  />
                  {stateSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setStateSearch('')}>
                      <Ionicons name="close-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredStates.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStateName(s);
                        setShowStateDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredStates.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No states found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GSTIN/UIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter GSTIN (optional)"
                placeholderTextColor="#AAA"
                autoCapitalize="characters"
                value={gstin}
                onChangeText={setGstin}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#777',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  headerPlaceholder: {
    width: 28,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    color: '#E75555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  dropdownButton: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: '#AAA',
  },
  dropdownList: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    gap: 6,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111',
    paddingVertical: 0,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  emptyState: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#999',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

