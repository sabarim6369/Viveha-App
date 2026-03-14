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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { getDashboardInsights, useNetworkStatus } from '../utils/NetworkManager';

const { width } = Dimensions.get('window');

export default function InsightsScreen({ navigation }) {
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalSales: 0,
        totalPending: 0,
        totalInvoices: 0,
        topItems: [],
        monthlyData: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{ data: [0, 0, 0, 0, 0, 0] }]
        }
    });

    const { isConnected, isInternetReachable } = useNetworkStatus();

    useEffect(() => {
        loadInsights();
    }, [isConnected, isInternetReachable]);

    const loadInsights = async () => {
        setIsLoading(true);
        try {
            const result = await getDashboardInsights(6, 5);

            if (result && result.data) {
                const { summary, salesTrends, topItems } = result.data;

                // Process sales trends for chart
                const labels = salesTrends.map(t => t.month);
                const data = salesTrends.map(t => t.amount);

                // Ensure we have at least some data for the chart to render properly
                const chartData = data.length > 0 ? data : [0, 0, 0, 0, 0, 0];
                const chartLabels = labels.length > 0 ? labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

                setMetrics({
                    totalSales: summary.totalSales || 0,
                    totalPending: summary.pendingAmount || 0,
                    totalInvoices: summary.pendingInvoices || 0, // Now using pending invoices count
                    topItems: topItems.map(item => ({
                        name: item.itemName,
                        revenue: item.amount,
                        quantity: item.quantity
                    })),
                    monthlyData: {
                        labels: chartLabels,
                        datasets: [{ data: chartData }]
                    }
                });

                if (result.source === 'cache') {
                    // thorough offline indication optionally
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
        color: (opacity = 1) => `rgba(107, 142, 255, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#6B8EFF"
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Business Insights</Text>
                <View style={{ width: 24 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E88E99" />
                    <Text style={styles.loadingText}>Gathering insights...</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Key Metrics Cards */}
                    <View style={styles.cardsContainer}>
                        <View style={[styles.card, styles.salesCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardLabel}>Total Sales</Text>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="trending-up" size={20} color="#4CAF50" />
                                </View>
                            </View>
                            <Text style={styles.cardValue}>
                                Rs.{metrics.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </Text>
                            <Text style={styles.cardSubtext}>+ All time</Text>
                        </View>

                        <View style={[styles.card, styles.pendingCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardLabel}>Pending</Text>
                                <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                                    <Ionicons name="time" size={20} color="#F44336" />
                                </View>
                            </View>
                            <Text style={[styles.cardValue, { color: '#F44336' }]}>
                                Rs.{metrics.totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </Text>
                            <Text style={styles.cardSubtext}>{metrics.totalInvoices} invoices pending</Text>
                        </View>
                    </View>

                    {/* Sales Chart Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Sales Trends (Last 6 Months)</Text>
                        <View style={styles.chartCard}>
                            <LineChart
                                data={metrics.monthlyData}
                                width={width - 50}
                                height={220}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                                yAxisLabel="₹"
                                yAxisSuffix="k"
                                formatYLabel={(val) => Math.round(val / 1000)}
                            />
                        </View>
                    </View>

                    {/* Top Products Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Top Selling Items</Text>
                        <View style={styles.listCard}>
                            {metrics.topItems.length > 0 ? (
                                metrics.topItems.map((item, index) => (
                                    <View key={index} style={styles.listItem}>
                                        <View style={styles.rankContainer}>
                                            <Text style={styles.rankText}>#{index + 1}</Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemRevenue}>Revenue: Rs.{item.revenue.toFixed(0)}</Text>
                                        </View>
                                        <View style={styles.itemQuantity}>
                                            <Text style={styles.quantityText}>{item.quantity} sold</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No sales data available yet.</Text>
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
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 25,
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
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    cardsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 25,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    salesCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    pendingCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 5,
    },
    cardSubtext: {
        fontSize: 10,
        color: '#999',
    },
    sectionContainer: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    listCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
        marginRight: 10,
    },
    rankText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E88E99',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    itemRevenue: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    itemQuantity: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    quantityText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
    },
    bottomSpacing: {
        height: 50,
    },
});
