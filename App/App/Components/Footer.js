import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Footer({ activeTab = 'Home', navigation, pendingCount = 0 }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'AddInvoice', icon: 'add-circle-outline', activeIcon: 'add-circle', label: 'Add Invoice' },
    { name: 'Pendings', icon: 'time-outline', activeIcon: 'time' },
    { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const handleTabPress = (tabName) => {
    if (navigation) {
      navigation.navigate(tabName);
    }
  };

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
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
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? '#E88E99' : '#999'}
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
              {tab.label || tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#E88E99',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
