import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    StatusBar,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import SyncIndicator from '../Components/SyncIndicator';
import { 
  getClients,
  useNetworkStatus,
  getPendingSyncItems
} from '../utils/NetworkManager';

// Type definitions
interface ContactsScreenProps {
    navigation: any;
}

interface Client {
    id: string;
    name?: string;
    phone?: string;
}

interface GroupedClients {
    title: string;
    data: Client[];
}

export default function ContactsScreen({ navigation }: ContactsScreenProps): React.JSX.Element {
    // Network status monitoring
    const { isConnected, isInternetReachable } = useNetworkStatus();
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [groupedClients, setGroupedClients] = useState<GroupedClients[]>([]);

    useEffect(() => {
        loadClients();
        updatePendingSyncCount();
    }, []);

    // Update pending sync count
    const updatePendingSyncCount = async () => {
        try {
            const pendingItems = await getPendingSyncItems();
            setPendingSyncCount(pendingItems.length);
        } catch (error) {
            console.error('Error getting pending sync count:', error);
        }
    };

    // Monitor network status
    useEffect(() => {
        if (isConnected && isInternetReachable) {
            const checkSync = async () => {
                const pending = await getPendingSyncItems();
                if (pending.length > 0) {
                    setIsSyncing(true);
                    setTimeout(() => {
                        setIsSyncing(false);
                        updatePendingSyncCount();
                    }, 3000);
                }
            };
            checkSync();
        }
    }, [isConnected, isInternetReachable]);

    useEffect(() => {
        filterClients();
    }, [searchQuery, clients]);

    const loadClients = async (): Promise<void> => {
        try {
            const isOffline = !isConnected || !isInternetReachable;
            
            const data = await getClients();
            // Sort by name alphabetically
            const sortedData = (data || []).sort((a: Client, b: Client) =>
                (a.name || '').localeCompare(b.name || '')
            );
            setClients(sortedData);
            setFilteredClients(sortedData);
            
            if (isOffline && sortedData.length > 0) {
                Toast.show({
                    type: 'info',
                    text1: 'Offline Mode',
                    text2: 'Showing cached contacts',
                    position: 'bottom',
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            console.error('Error loading clients:', error);
            Alert.alert('Error', 'Failed to load contacts');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = (): void => {
        setRefreshing(true);
        loadClients();
    };

    const filterClients = (): void => {
        let filtered: Client[];
        if (!searchQuery.trim()) {
            filtered = clients;
        } else {
            const query = searchQuery.toLowerCase();
            filtered = clients.filter((client: Client) =>
                (client.name && client.name.toLowerCase().includes(query)) ||
                (client.phone && client.phone.includes(query))
            );
        }
        
        setFilteredClients(filtered);
        groupClientsByAlphabet(filtered);
    };

    const groupClientsByAlphabet = (clientList: Client[]): void => {
        const groups: { [key: string]: Client[] } = {};
        
        clientList.forEach((client) => {
            const firstLetter = (client.name || '?').charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
            
            if (!groups[letter]) {
                groups[letter] = [];
            }
            groups[letter].push(client);
        });

        const grouped: GroupedClients[] = Object.keys(groups)
            .sort()
            .map((letter) => ({
                title: letter,
                data: groups[letter],
            }));

        setGroupedClients(grouped);
    };

    const getAvatarColor = (name: string): string => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
        ];
        const index = (name?.charCodeAt(0) || 0) % colors.length;
        return colors[index];
    };

    const renderItem = ({ item }: { item: Client }): React.JSX.Element => {
        const avatarColor = getAvatarColor(item.name || 'U');
        const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';
        
        return (
            <TouchableOpacity 
                style={styles.clientItem}
                onPress={() => navigation.navigate('ContactInvoices', { 
                    contact: { 
                        id: item.id, 
                        name: item.name, 
                        phone: item.phone 
                    }
                })}
                activeOpacity={0.7}
            >
                <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.clientPhone}>{item.phone || 'No phone number'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section }: { section: GroupedClients }): React.JSX.Element => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderBadge}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        </View>
    );

    const ListHeaderComponent = (): React.JSX.Element => (
        <View style={styles.contactsHeader}>
            <Text style={styles.contactsTitle}>Contacts</Text>
            <Text style={styles.contactsCount}>
                {filteredClients.length} contact{filteredClients.length !== 1 ? 's' : ''} saved
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Sync Indicator */}
            <SyncIndicator 
                isSyncing={isSyncing}
                isOnline={isConnected && isInternetReachable}
                pendingCount={pendingSyncCount}
            />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name={"arrow-back" as any} size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Contacts</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name={"search" as any} size={20} color="#7A7A7A" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search name, number....."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity
                    style={styles.searchAddButton}
                    onPress={() => navigation.navigate('CreateCustomer')}
                >
                    <Ionicons name={"add" as any} size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {isLoading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88E99" />
                </View>
            ) : filteredClients.length > 0 ? (
                <SectionList
                    sections={groupedClients}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    keyExtractor={(item: Client) => item.id}
                    ListHeaderComponent={ListHeaderComponent}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    stickySectionHeadersEnabled={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name={"people-outline" as any} size={80} color="#E0E0E0" />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'No contacts found matching your search' : 'No contacts yet'}
                    </Text>
                    {!searchQuery && (
                        <Text style={styles.emptySubtext}>
                            Contacts are automatically added when you create invoices
                        </Text>
                    )}
                </View>
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateCustomer')}
                activeOpacity={0.8}
            >
                <Ionicons name={"add" as any} size={30} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 8,
        width: 40,
    },
    headerSpacer: {
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 14,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8ECEF',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#1A1A1A',
    },
    searchAddButton: {
        padding: 6,
        marginLeft: 8,
    },
    contactsHeader: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    contactsTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
        textAlign: 'center',
    },
    contactsCount: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingBottom: 100,
    },
    sectionHeader: {
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    sectionHeaderBadge: {
        alignSelf: 'flex-start',
    },
    sectionHeaderText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E88E99',
        letterSpacing: 0.5,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatarContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 3,
    },
    clientPhone: {
        fontSize: 14,
        color: '#7A7A7A',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: -80,
    },
    emptyText: {
        fontSize: 17,
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E88E99',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E88E99',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
});
