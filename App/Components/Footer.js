import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Footer({ activeTab = 'Home', navigation, pendingCount = 0 }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Dealer', icon: 'people-outline', activeIcon: 'people' },
    { name: 'AddInvoice', icon: 'receipt', activeIcon: 'receipt', isCenter: true },
    { name: 'Pendings', icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const handleTabPress = (tabName) => {
    if (navigation) {
      navigation.navigate(tabName);
    }
  };

  return (
    <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.footer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerButton}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.7}
              >
                <View style={styles.centerIconContainer}>
                  <Ionicons
                    name={tab.icon}
                    size={28}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>
            );
          }
          
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
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    position: 'relative',
  },
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
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  centerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E75757',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
