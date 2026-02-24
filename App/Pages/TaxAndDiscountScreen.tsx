import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

interface TaxAndDiscountScreenProps {
    navigation: any;
}

interface TaxDiscountSettings {
    taxEnabled: boolean;
    taxPercentage: string;
    seasonalPromo: boolean;
    firstTimeUser: boolean;
    holidaySpecial: boolean;
}

export default function TaxAndDiscountScreen({ navigation }: TaxAndDiscountScreenProps): React.JSX.Element {
    const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
    const [taxPercentage, setTaxPercentage] = useState<string>('18.00');

    const [seasonalPromo, setSeasonalPromo] = useState<boolean>(true);
    const [firstTimeUser, setFirstTimeUser] = useState<boolean>(true);
    const [holidaySpecial, setHolidaySpecial] = useState<boolean>(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async (): Promise<void> => {
        try {
            const storedSettings = await AsyncStorage.getItem('@viveha_tax_discount_settings');
            if (storedSettings) {
                const settings: TaxDiscountSettings = JSON.parse(storedSettings);
                setTaxEnabled(settings.taxEnabled ?? false);
                setTaxPercentage(settings.taxPercentage || '18.00');
                setSeasonalPromo(settings.seasonalPromo ?? true);
                setFirstTimeUser(settings.firstTimeUser ?? true);
                setHolidaySpecial(settings.holidaySpecial ?? false);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const saveSettings = async (): Promise<void> => {
        try {
            const settings: TaxDiscountSettings = {
                taxEnabled,
                taxPercentage,
                seasonalPromo,
                firstTimeUser,
                holidaySpecial
            };
            await AsyncStorage.setItem('@viveha_tax_discount_settings', JSON.stringify(settings));

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Settings saved successfully'
            });

            navigation.goBack();
        } catch (error) {
            console.error('Failed to save settings', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save settings'
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={"arrow-back" as any} size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>

                    {/* Development Banner */}
                    <View style={styles.devBanner}>
                        <Ionicons name={"construct" as any} size={24} color="#E65100" />
                        <View style={styles.devBannerTextContainer}>
                            <Text style={styles.devBannerTitle}>Under Development</Text>
                            <Text style={styles.devBannerSubtitle}>This feature is currently being built. Changes may not be fully supported yet.</Text>
                        </View>
                    </View>

                    {/* Tax Settings Section */}
                    <Text style={styles.sectionHeader}>Tax Settings</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.itemTitle}>Enable Tax Calculation</Text>
                                <Text style={styles.itemSubtitle}>Apply tax to all invoices.</Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#e0e0e0', true: '#FF8A65' }}
                                thumbColor={taxEnabled ? '#fff' : '#fff'}
                                ios_backgroundColor="#e0e0e0"
                                onValueChange={setTaxEnabled}
                                value={taxEnabled}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Primary tax (GST/VAT)%</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.textInput}
                                    value={taxPercentage}
                                    onChangeText={setTaxPercentage}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                                <Text style={styles.inputSuffix}>%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Discount Management Section */}
                    <Text style={styles.sectionHeader}>Discount Management</Text>

                    <View style={styles.card}>
                        {/* Seasonal Promo */}
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.itemTitle}>Seasonal Promo</Text>
                                <Text style={styles.itemSubtitle}>10% Off • Applied Automatically</Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#e0e0e0', true: '#FF8A65' }}
                                thumbColor={seasonalPromo ? '#fff' : '#fff'}
                                ios_backgroundColor="#e0e0e0"
                                onValueChange={setSeasonalPromo}
                                value={seasonalPromo}
                            />
                        </View>
                    </View>

                    <View style={styles.card}>
                        {/* First Time User */}
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.itemTitle}>First Time User</Text>
                                <Text style={styles.itemSubtitle}>$50.00 Fixed • One-time</Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#e0e0e0', true: '#FF8A65' }}
                                thumbColor={firstTimeUser ? '#fff' : '#fff'}
                                ios_backgroundColor="#e0e0e0"
                                onValueChange={setFirstTimeUser}
                                value={firstTimeUser}
                            />
                        </View>
                    </View>

                    <View style={[styles.card, styles.disabledCard]}>
                        {/* Holiday Special */}
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={[styles.itemTitle, styles.disabledText]}>Holiday Special</Text>
                                <Text style={[styles.itemSubtitle, styles.disabledText]}>15% Off • Expired</Text>
                            </View>
                            <Switch
                                disabled={true}
                                trackColor={{ false: '#e0e0e0', true: '#FF8A65' }}
                                thumbColor={'#fff'}
                                ios_backgroundColor="#e0e0e0"
                                onValueChange={setHolidaySpecial}
                                value={holidaySpecial}
                            />
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                    <Ionicons name={"save-outline" as any} size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 10,
    },
    backButton: {
        padding: 5,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 10,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        marginTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 15,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 4,
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#999',
    },
    inputContainer: {
        marginTop: 20,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 50,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    inputSuffix: {
        fontSize: 16,
        color: '#999',
    },
    disabledCard: {
        opacity: 0.8,
    },
    disabledText: {
        color: '#aaa',
    },
    footer: {
        padding: 20,
        backgroundColor: '#F7F7F7', // Or transparent if you want it over content
    },
    saveButton: {
        backgroundColor: '#FF8A65',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: '#FF8A65',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    devBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    devBannerTextContainer: {
        marginLeft: 15,
        flex: 1,
    },
    devBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#E65100',
        marginBottom: 4,
    },
    devBannerSubtitle: {
        fontSize: 13,
        color: '#EF6C00',
        lineHeight: 18,
    },
});
