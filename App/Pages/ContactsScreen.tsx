import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getClients, deleteClient } from '../utils/NetworkManager';

// Type definitions
interface ContactsScreenProps {
    navigation: any;
}

interface Client {
    id: string;
    name?: string;
    phone?: string;
}

interface DeleteClientResult {
    success: boolean;
}

export default function ContactsScreen({ navigation }: ContactsScreenProps): React.JSX.Element {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        filterClients();
    }, [searchQuery, clients]);

    const loadClients = async (): Promise<void> => {
        try {
            const data = await getClients();
            // Sort by name alphabetically
            const sortedData = (data || []).sort((a: Client, b: Client) =>
                (a.name || '').localeCompare(b.name || '')
            );
            setClients(sortedData);
            setFilteredClients(sortedData);
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
        if (!searchQuery.trim()) {
            setFilteredClients(clients);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = clients.filter((client: Client) =>
            (client.name && client.name.toLowerCase().includes(query)) ||
            (client.phone && client.phone.includes(query))
        );
        setFilteredClients(filtered);
    };

    const handleDeleteContact = (client: Client): void => {
        Alert.alert(
            'Delete Contact',
            `Are you sure you want to delete ${client.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async (): Promise<void> => {
                        setIsLoading(true);
                        const result: DeleteClientResult = await deleteClient(client.id);
                        if (result.success) {
                            loadClients(); // Reload list
                        } else {
                            Alert.alert('Error', 'Failed to delete contact');
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Client }): React.JSX.Element => (
        <View style={styles.clientItem}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                </Text>
            </View>
            <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientPhone}>{item.phone || 'No phone number'}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteContact(item)}
            >
                <Ionicons name={"trash-outline" as any} size={20} color="#F44336" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name={"arrow-back" as any} size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Contacts</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name={"search" as any} size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name={"close-circle" as any} size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            {isLoading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88E99" />
                </View>
            ) : filteredClients.length > 0 ? (
                <FlatList
                    data={filteredClients}
                    renderItem={renderItem}
                    keyExtractor={(item: Client) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name={"people-outline" as any} size={64} color="#ccc" />
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
        </SafeAreaView>
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
        paddingTop: 45,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 15,
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 15,
        paddingTop: 0,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#FFF0F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#E88E99',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    clientPhone: {
        fontSize: 14,
        color: '#666',
    },
    deleteButton: {
        padding: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: -50,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginTop: 15,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 250,
    },
});
