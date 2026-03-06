import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

import { getDashboardInsights, useNetworkStatus } from '../utils/NetworkManager';

const { width } = Dimensions.get('window');

// Type definitions
interface InsightsScreenProps {
    navigation: any;
}

interface TopItem {
    name: string;
    revenue: number;
    quantity: number;
}

interface MonthlyData {
    labels: string[];
    datasets: Array<{
        data: number[];
        color?: (opacity: number) => string;
        strokeWidth?: number;
    }>;
}

interface Metrics {
    totalSales: number;
    totalPending: number;
    totalInvoices: number;
    topItems: TopItem[];
    monthlyData: MonthlyData;
}

interface SalesTrend {
    month: string;
    totalInvoiced: number;
    totalReceived: number;
}

interface TopItemBackend {
    itemName: string;
    amount: number;
    quantity: number;
}

interface Summary {
    totalRevenue?: number;
    totalReceived?: number;
    pendingAmount?: number;
    pendingInvoices?: number;
}

interface InsightsData {
    summary: Summary;
    salesTrends: SalesTrend[];
    topItems: TopItemBackend[];
}

interface InsightsResult {
    data?: InsightsData;
    source?: string;
}

export default function InsightsScreen({ navigation }: InsightsScreenProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('Today');
    const [metrics, setMetrics] = useState<Metrics>({
        totalSales: 0,
        totalPending: 0,
        totalInvoices: 0,
        topItems: [],
        monthlyData: {
            labels: ["W1", "W2", "W3", "W4"],
            datasets: [
                { 
                    data: [20000, 35000, 45000, 60000],
                    color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                    strokeWidth: 3
                },
                { 
                    data: [15000, 25000, 30000, 40000],
                    color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
                    strokeWidth: 3
                }
            ]
        }
    });

    const { isConnected, isInternetReachable } = useNetworkStatus();

    const periods = ['Today', 'This Week', 'This Month', 'This Year'];

    useEffect(() => {
        loadInsights();
    }, [isConnected, isInternetReachable]);

    const loadInsights = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const result: InsightsResult = await getDashboardInsights(6, 5);

            if (result && result.data) {
                const { summary, salesTrends, topItems } = result.data;

                // Get total revenue and received amounts from backend
                const totalRevenue = summary.totalRevenue || 0;
                const totalReceived = summary.totalReceived || 0;
                const pendingAmount = summary.pendingAmount || 0;

                // Process sales trends for chart - Sales vs Received
                const labels = salesTrends.map((t: SalesTrend) => t.month);
                const salesData = salesTrends.map((t: SalesTrend) => t.totalInvoiced);
                const receivedData = salesTrends.map((t: SalesTrend) => t.totalReceived);

                // Ensure we have at least some data for the chart to render properly
                const chartSalesData = salesData.length > 0 ? salesData : [0, 0, 0, 0, 0, 0];
                const chartReceivedData = receivedData.length > 0 ? receivedData : [0, 0, 0, 0, 0, 0];
                const chartLabels = labels.length > 0 ? labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

                setMetrics({
                    totalSales: totalRevenue,
                    totalPending: pendingAmount,
                    totalInvoices: summary.pendingInvoices || 0,
                    topItems: topItems.map((item: TopItemBackend) => ({
                        name: item.itemName,
                        revenue: item.amount,
                        quantity: item.quantity
                    })),
                    monthlyData: {
                        labels: chartLabels,
                        datasets: [
                            { 
                                data: chartSalesData,
                                color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                                strokeWidth: 3
                            },      // Total Sales/Invoiced (red line)
                            { 
                                data: chartReceivedData,
                                color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
                                strokeWidth: 3
                            }    // Amount Received (gray line)
                        ]
                    }
                });

                if (result.source === 'cache') {
                    console.log('Loaded insights from cache');
                }
            }
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const chartConfig = {
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        color: (opacity = 1, index) => {
            if (index === 0) return `rgba(231, 76, 60, ${opacity})`;
            return `rgba(149, 165, 166, ${opacity})`;
        },
        strokeWidth: 3,
        fillShadowGradientOpacity: 0,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#f5f5f5",
            strokeWidth: 1
        },
        propsForLabels: {
            fontSize: 10,
            fontFamily: 'System'
        },
        propsForDots: {
            r: 5,
            strokeWidth: 2,
            stroke: "#fff"
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name={"arrow-back" as any} size={24} color="#999" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Insight</Text>
                <View style={{ width: 24 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88E99" />
                    <Text style={styles.loadingText}>Gathering insights...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={styles.scrollView} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Top Value Cards */}
                    <LinearGradient
                        colors={['#E88E99', '#E88E99']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.topCardsGradient}
                    >
                        <View style={styles.topCardsRow}>
                            <View style={styles.topCardItem}>
                                <Text style={styles.topCardLabel}>TOTAL REVENUE</Text>
                                <Text style={styles.topCardValue}>
                                    ₹{metrics.totalSales.toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.topCardSubtext}>Total Invoiced</Text>
                            </View>
                            <View style={styles.topCardDivider} />
                            <View style={styles.topCardItem}>
                                <Text style={styles.topCardLabel}>PENDING</Text>
                                <Text style={styles.topCardValue}>
                                    ₹{metrics.totalPending.toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.topCardSubtext}>Yet to Receive</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Time Period Tabs */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.periodsContainer}
                        contentContainerStyle={styles.periodsContent}
                    >
                        {periods.map((period) => (
                            <TouchableOpacity
                                key={period}
                                style={[
                                    styles.periodTab,
                                    selectedPeriod === period && styles.periodTabActive
                                ]}
                                onPress={() => setSelectedPeriod(period)}
                            >
                                <Text style={[
                                    styles.periodText,
                                    selectedPeriod === period && styles.periodTextActive
                                ]}>
                                    {period}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Sales vs Received Chart */}
                    <View style={styles.chartSection}>
                        <View style={styles.chartHeader}>95A5A6
                            <Text style={styles.sectionTitle}>Sales vs Received</Text>
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
                                    <Text style={styles.legendText}>Sales</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#95A5A6' }]} />
                                    <Text style={styles.legendText}>Received</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.chartCard}>
                            <LineChart
                                data={metrics.monthlyData}
                                width={width - 60}
                                height={200}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                                withInnerLines={false}
                                withOuterLines={false}
                                withVerticalLines={false}
                                withVerticalLabels={false}
                                withHorizontalLines={true}
                                withDots={true}
                                withShadow={false}
                                segments={4}
                                yAxisInterval={1}
                                hidePointsAtIndex={[]}
                            />
                        </View>
                    </View>

                    {/* Top Selling Items */}
                    <View style={styles.topItemsSection}>
                        <Text style={styles.sectionTitle}>Top Selling Items</Text>
                        <View style={styles.topItemsCard}>
                            {metrics.topItems.length > 0 ? (
                                metrics.topItems.map((item: TopItem, index: number) => (
                                    <View key={index} style={styles.topItemRow}>
                                        <View style={styles.topItemLeft}>
                                            <View style={styles.topItemRank}>
                                                <Text style={styles.topItemRankText}>#{index + 1}</Text>
                                            </View>
                                            <View style={styles.topItemInfo}>
                                                <Text style={styles.topItemName}>{item.name}</Text>
                                                <Text style={styles.topItemQuantity}>{item.quantity} units sold</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.topItemRevenue}>
                                            ₹{item.revenue.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No sales data available</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
        paddingBottom: 15,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        flex: 1,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#999',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },
    
    // Top Cards Gradient
    topCardsGradient: {
        marginHorizontal: 16,
        marginTop: 20,
        borderRadius: 16,
        padding: 20,
    },
    topCardsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topCardItem: {
        flex: 1,
        alignItems: 'center',
    },
    topCardDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 20,
    },
    topCardLabel: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    topCardValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    topCardSubtext: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '400',
        marginTop: 4,
    },
    
    // Period Tabs
    periodsContainer: {
        marginTop: 20,
        marginBottom: 10,
    },
    periodsContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    periodTab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        marginRight: 10,
    },
    periodTabActive: {
        backgroundColor: '#E88E99',
    },
    periodText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    periodTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    
    // Chart Section
    chartSection: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    chartCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 12,
    },
    
    // Top Selling Items
    topItemsSection: {
        marginTop: 25,
        paddingHorizontal: 16,
    },
    topItemsCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 8,
        marginTop: 12,
    },
    topItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    topItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    topItemRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFF0F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    topItemRankText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FF8A9B',
    },
    topItemInfo: {
        flex: 1,
    },
    topItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    topItemQuantity: {
        fontSize: 11,
        color: '#999',
    },
    topItemRevenue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4CAF50',
    },
    
    emptyState: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
    },
    bottomSpacing: {
        height: 20,
    },
});
