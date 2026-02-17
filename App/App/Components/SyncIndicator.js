import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SyncIndicator({ isSyncing, isOnline, pendingCount }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isSyncing]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isSyncing && isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[
        styles.indicator,
        !isOnline && styles.offlineIndicator,
        isSyncing && styles.syncingIndicator,
      ]}>
        {isSyncing ? (
          <>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="sync" size={14} color="#fff" />
            </Animated.View>
            <Text style={styles.text}>Syncing...</Text>
          </>
        ) : !isOnline ? (
          <>
            <Ionicons name="cloud-offline" size={14} color="#fff" />
            <Text style={styles.text}>Offline{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}</Text>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Ionicons name="cloud-upload" size={14} color="#fff" />
            <Text style={styles.text}>{pendingCount} items to sync</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  offlineIndicator: {
    backgroundColor: '#FF9800',
  },
  syncingIndicator: {
    backgroundColor: '#2196F3',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
