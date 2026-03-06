import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Type definitions
interface FooterProps {
  activeTab?: string;
  navigation: any;
  pendingCount?: number;
}

interface Tab {
  name: string;
  icon: string;
  activeIcon: string;
  label: string;
}

export default function Footer({ activeTab = 'Home', navigation, pendingCount = 0 }: FooterProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  
  const leftTabs: Tab[] = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'Items', icon: 'cash-outline', activeIcon: 'cash', label: 'Pricelist' },
  ];

  const rightTabs: Tab[] = [
    { name: 'Pendings', icon: 'clipboard-outline', activeIcon: 'clipboard', label: 'Pendings' },
    { name: 'Profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
  ];

  const handleTabPress = (tabName: string): void => {
    if (navigation) {
      navigation.navigate(tabName);
    }
  };

  const handleCreateInvoice = (): void => {
    if (navigation) {
      navigation.navigate('AddInvoice');
    }
  };

  return (
    <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 5) }]}>
      <View style={styles.footer}>
        {/* Left Tabs */}
        <View style={styles.tabsSection}>
          {leftTabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabButton, tab.name === 'Items' && styles.pricelistTab]}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={24}
                  color={isActive ? '#333' : '#999'}
                />
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Create Invoice Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateInvoice}
          activeOpacity={0.8}
        >
          <View style={styles.createButtonInner}>
            <Ionicons name="receipt-outline" size={28} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Right Tabs */}
        <View style={styles.tabsSection}>
          {rightTabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.7}
              >
                <View>
                  <Ionicons
                    name={(isActive ? tab.activeIcon : tab.icon) as any}
                    size={24}
                    color={isActive ? '#333' : '#999'}
                  />
                  {tab.name === 'Pendings' && pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabsSection: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  pricelistTab: {
    marginRight: 10,
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#333',
    fontWeight: '600',
  },
  createButton: {
    position: 'absolute',
    top: -30,
    left: '50%',
    marginLeft: -30,
    zIndex: 10,
  },
  createButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E46269',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E46269',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
