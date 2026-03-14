import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../Components/Footer';
import { getDealers, getItems } from '../utils/NetworkManager';

export default function DealerMainScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [dealers, setDealers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [dealersData, itemsData] = await Promise.all([
        getDealers(),
        getItems(),
      ]);
      setDealers(dealersData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalItemsFromDealers = () => {
    return items.filter(item => item.dealerId).length;
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dealer Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose an option to manage your dealers</Text>

        {/* Create New Dealer Card */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('AddDealer')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="add-circle" size={50} color="#E88494" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create New Dealer</Text>
            <Text style={styles.optionDescription}>
              Add a new dealer with business details, contact information, and more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        {/* Dealer Catalog Card */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('DealerCatalog')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="albums" size={50} color="#7B68EE" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Dealer Catalog</Text>
            <Text style={styles.optionDescription}>
              View all dealers, their products, balances, and transaction history
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="people" size={24} color="#E88494" />
            {loading ? (
              <ActivityIndicator size="small" color="#E88494" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.statNumber}>{dealers.length}</Text>
                <Text style={styles.statLabel}>Total Dealers</Text>
              </>
            )}
          </View>
          <View style={styles.statBox}>
            <Ionicons name="cube" size={24} color="#4CAF50" />
            {loading ? (
              <ActivityIndicator size="small" color="#4CAF50" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.statNumber}>{getTotalItemsFromDealers()}</Text>
                <Text style={styles.statLabel}>Dealer Items</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Footer */}
      <Footer activeTab="Dealer" navigation={navigation} />
    </View>
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
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
