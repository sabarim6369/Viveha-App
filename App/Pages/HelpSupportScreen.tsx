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
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                    <Ionicons name="close" size={28} color="#D1D1D1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={styles.headerIconButton} />
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
                            <View style={styles.iconWrapper}>
                                <Ionicons name="call-outline" size={24} color="#777" />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>Call Us</Text>
                                <Text style={styles.contactDetails}>+91-9003672804</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={handleCallNow}>
                            <Text style={styles.actionButtonText}>Call Now</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email Us */}
                    <View style={styles.contactCard}>
                        <View style={styles.contactLeft}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name="mail-outline" size={24} color="#777" />
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
                            <View style={styles.iconWrapper}>
                                <Ionicons name="logo-whatsapp" size={24} color="#777" />
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
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    headerIconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
        flex: 1,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    illustrationContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    illustrationImage: {
        width: 320,
        height: 280,
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
        padding: 18,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    contactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        marginBottom: 2,
    },
    contactDetails: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    actionButton: {
        backgroundColor: '#D1706C',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        minWidth: 110,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});
