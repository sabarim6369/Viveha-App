import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Footer from '../Components/Footer';

interface HelpSupportScreenProps {
    navigation: any;
}

export default function HelpSupportScreen({ navigation }: HelpSupportScreenProps): React.JSX.Element {
    const insets = useSafeAreaInsets();

    const handleCallNow = async (): Promise<void> => {
        const phoneNumber = '+919603072804';
        const url = `tel:${phoneNumber}`;
        
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Error making phone call:', error);
            Alert.alert('Error', 'Unable to make phone call. Please check if you have a phone app installed.');
        }
    };

    const handleSendEmail = async (): Promise<void> => {
        const email = 'support@viveha.com';
        const subject = 'Support Request';
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
        
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Error opening email:', error);
            Alert.alert('Error', 'Unable to open email client. Please check if you have an email app installed.');
        }
    };

    const handleWhatsAppChat = async (): Promise<void> => {
        const phoneNumber = '919603072804';
        const message = 'Hello, I need support with Viveha app.';
        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            Alert.alert('Error', 'Unable to open WhatsApp. Please check if WhatsApp is installed on your device.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Illustration */}
                <View style={styles.illustrationContainer}>
                    <Image
                        source={require('../assets/helpandsupport.jpeg')}
                        style={styles.illustrationImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Contact Options */}
                <View style={styles.contactContainer}>
                    {/* Call Us */}
                    <View style={styles.contactCard}>
                        <View style={styles.contactLeft}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="call" size={24} color="#4CAF50" />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>Call Us</Text>
                                <Text style={styles.contactDetails}>+91-9603072804</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={handleCallNow}>
                            <Text style={styles.actionButtonText}>Call Now</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email Us */}
                    <View style={styles.contactCard}>
                        <View style={styles.contactLeft}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="mail" size={24} color="#2196F3" />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>Email Us</Text>
                                <Text style={styles.contactDetails}>support@viveha.com</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={handleSendEmail}>
                            <Text style={styles.actionButtonText}>Send Email</Text>
                        </TouchableOpacity>
                    </View>

                    {/* WhatsApp Support */}
                    <View style={styles.contactCard}>
                        <View style={styles.contactLeft}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>WhatsApp Support</Text>
                                <Text style={styles.contactDetails}>Online Now</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsAppChat}>
                            <Text style={styles.actionButtonText}>Chat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <Footer navigation={navigation} activeTab="Profile" />
        </View>
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
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 24,
    },
    scrollView: {
        flex: 1,
    },
    illustrationContainer: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    illustrationImage: {
        width: 280,
        height: 220,
    },
    contactContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    contactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    contactDetails: {
        fontSize: 13,
        color: '#666',
    },
    actionButton: {
        backgroundColor: '#E46269',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
