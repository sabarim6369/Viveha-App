import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Type definitions
interface VisitingCardScreenProps {
    navigation: any;
}

interface ShopDetails {
    shopName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
}

interface ShopData {
    shopName?: string;
    ownerName?: string;
    email?: string;
    mobileNumber?: string;
    shopAddress?: string;
    city?: string;
    state?: string;
}

interface UserProfileData {
    email?: string;
    name?: string;
    phone?: string;
    mobileNumber?: string;
    address?: string;
}

export default function VisitingCardScreen({ navigation }: VisitingCardScreenProps): React.JSX.Element {
    const viewShotRef = useRef<ViewShot>(null);
    const [shopDetails, setShopDetails] = useState<ShopDetails>({
        shopName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
    const [newEmail, setNewEmail] = useState<string>('');

    useEffect(() => {
        loadShopDetails();
    }, []);

    const loadShopDetails = async (): Promise<void> => {
        try {
            const details = await AsyncStorage.getItem('@viveha_shop_details');
            const userProfile = await AsyncStorage.getItem('@viveha_user_profile');
            const userDataStr = await AsyncStorage.getItem('@viveha_user_data');

            let shopData: ShopData = {};
            let userProfileData: UserProfileData = {};
            let userData: UserProfileData = {};

            if (details) shopData = JSON.parse(details);
            if (userProfile) userProfileData = JSON.parse(userProfile);
            if (userDataStr) userData = JSON.parse(userDataStr);

            // Merge user data sources (profile vs general user data)
            const finalUserData: UserProfileData = { ...userData, ...userProfileData };

            // Prioritize user profile data for personal info
            const email = finalUserData.email || shopData.email || '';

            // Construct address from user profile first, then shop details
            let displayAddress = '';
            if (finalUserData.address) {
                displayAddress = finalUserData.address;
            } else {
                displayAddress = [
                    shopData.shopAddress,
                    shopData.city,
                    shopData.state,
                ].filter(Boolean).join(', ');
            }

            // Owner Name: User Name -> Shop Owner Name -> "OWNER NAME"
            const ownerName = finalUserData.name || shopData.ownerName || 'OWNER NAME';

            // Phone: User Phone -> Shop Mobile -> Default
            const phone = finalUserData.phone || finalUserData.mobileNumber || shopData.mobileNumber || '+91-';

            setShopDetails({
                shopName: shopData.shopName || 'YOUR COMPANY NAME',
                ownerName: ownerName,
                email: email,
                phone: phone,
                address: displayAddress || 'Address not set',
            });

            // If email is missing, ask for it
            if (!email || email.trim() === '') {
                setShowEmailModal(true);
            }

        } catch (error) {
            console.error('Error loading details:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveEmail = async (): Promise<void> => {
        if (!newEmail.trim()) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        try {
            // Update local state
            setShopDetails(prev => ({ ...prev, email: newEmail }));

            // Save to AsyncStorage - update user profile
            // We'll update both keys to be safe
            const userProfile = await AsyncStorage.getItem('@viveha_user_profile');
            let userProfileData: UserProfileData = userProfile ? JSON.parse(userProfile) : {};
            userProfileData.email = newEmail;
            await AsyncStorage.setItem('@viveha_user_profile', JSON.stringify(userProfileData));

            // Also try updating @viveha_user_data if it exists
            const userDataStr = await AsyncStorage.getItem('@viveha_user_data');
            if (userDataStr) {
                let userData: UserProfileData = JSON.parse(userDataStr);
                userData.email = newEmail;
                await AsyncStorage.setItem('@viveha_user_data', JSON.stringify(userData));
            }

            setShowEmailModal(false);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Email updated successfully',
            });
        } catch (error) {
            console.error('Error saving email:', error);
            Alert.alert('Error', 'Failed to save email');
        }
    };

    const handleShare = async (): Promise<void> => {
        try {
            if (viewShotRef.current && viewShotRef.current.capture) {
                const uri = await viewShotRef.current.capture();
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Sharing is not available on this device',
                        position: 'bottom',
                    });
                }
            }
        } catch (error) {
            console.error('Error sharing card:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to share card',
                position: 'bottom',
            });
        }
    };

    const handleDownload = async (): Promise<void> => {
        handleShare();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={"arrow-back" as any} size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visiting Card</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Card View */}
                <View style={styles.cardContainer}>
                    <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                        <LinearGradient
                            colors={['#E55D6A', '#C62828']}
                            style={styles.card}
                        >
                            {/* Vertical Stripe with Company Name */}
                            <View style={styles.verticalStripeContainer}>
                                <View style={styles.verticalStripe}>
                                    <Text style={styles.verticalText}>
                                        {shopDetails.shopName ? shopDetails.shopName.toUpperCase() : 'COMPANY'}
                                    </Text>
                                    {/* Square Logo Placeholder at bottom of stripe */}
                                    <View style={styles.logoPlaceholder} />
                                </View>
                            </View>

                            {/* Bottom Square Decor */}
                            <View style={styles.bottomDecor} />

                            {/* Content */}
                            <View style={styles.contentContainer}>

                                <View style={styles.ownerSection}>
                                    <Text style={styles.roleLabel}>OWNER</Text>
                                    <Text style={styles.ownerName}>
                                        {shopDetails.ownerName ? shopDetails.ownerName.toUpperCase() : 'NAME'}
                                    </Text>
                                </View>

                                <View style={styles.contactSection}>
                                    {shopDetails.email ? (
                                        <Text style={styles.contactText}>{shopDetails.email}</Text>
                                    ) : null}
                                    <Text style={styles.contactText}>{shopDetails.phone}</Text>
                                    <Text style={styles.addressText}>{shopDetails.address}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </ViewShot>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
                        <Ionicons name={"download-outline" as any} size={24} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Ionicons name={"share-social-outline" as any} size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.brandingContainer}>
                    <Text style={styles.brandingText}>✨ viveha.ai</Text>
                </View>

            </ScrollView>

            {/* Email Input Modal */}
            <Modal
                visible={showEmailModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    // Optional: allow closing if user really doesn't want to provide email
                    // setShowEmailModal(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Email Address</Text>
                        <Text style={styles.modalSubtitle}>Please provide your email to complete your visiting card.</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="email@example.com"
                            value={newEmail}
                            onChangeText={setNewEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TouchableOpacity style={styles.saveButton} onPress={saveEmail}>
                            <Text style={styles.saveButtonText}>Save Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={() => setShowEmailModal(false)}
                        >
                            <Text style={styles.skipButtonText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#004daa',
        textDecorationLine: 'underline',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    cardContainer: {
        marginTop: 100, // Significantly increased top margin
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderRadius: 20,
    },
    card: {
        width: width * 0.85,
        height: (width * 0.85) * 1.6, // Aspect ratio
        borderRadius: 20,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#D32F2F',
    },
    verticalStripeContainer: {
        position: 'absolute',
        top: 0,
        bottom: '25%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    verticalStripe: {
        backgroundColor: '#000',
        width: 50,
        height: '60%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    verticalText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        transform: [{ rotate: '-90deg' }],
        width: 400,
        textAlign: 'center',
        top: 150,
        letterSpacing: 2,
    },
    logoPlaceholder: {
        width: 30,
        height: 30,
        backgroundColor: '#fff',
        marginTop: 'auto',
        marginBottom: 10,
    },
    bottomDecor: {
        position: 'absolute',
        bottom: 0,
        width: 40,
        height: 30,
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 40,
    },
    ownerSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    roleLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 5,
    },
    ownerName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '300',
        letterSpacing: 2,
    },
    contactSection: {
        alignItems: 'center',
        gap: 8,
    },
    contactText: {
        color: '#fff',
        fontSize: 12,
    },
    addressText: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
        maxWidth: '80%',
        marginTop: 5,
    },
    actionsContainer: {
        marginTop: 40,
        gap: 20,
    },
    actionButton: {
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandingContainer: {
        marginTop: 40,
    },
    brandingText: {
        color: '#999',
        fontSize: 14,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#E55D6A',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButton: {
        paddingVertical: 10,
    },
    skipButtonText: {
        color: '#999',
        fontSize: 14,
    }
});
