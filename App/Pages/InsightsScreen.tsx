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
import { LineChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';

import Footer from '../Components/Footer';
import { getDashboardInsights, getInvoices, useNetworkStatus } from '../utils/NetworkManager';

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
    monthlyPerformance: number;
    averageTransactionValue: number;
    invoiceCount: number;
}

interface InvoiceRecord {
    totalAmount?: number;
    amount?: number;
}

interface SalesTrend {
    label?: string;
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
            labels: [],
            datasets: [
                { 
                    data: [],
                    color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                    strokeWidth: 3
                },
                { 
                    data: [],
                    color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
                    strokeWidth: 3
                }
            ]
        },
        monthlyPerformance: 0,
        averageTransactionValue: 0,
        invoiceCount: 0,
    });

    const { isConnected, isInternetReachable } = useNetworkStatus();

    const periods = ['Today', 'This Week', 'This Month', 'This Year'];

    useEffect(() => {
        loadInsights();
    }, [isConnected, isInternetReachable, selectedPeriod]);

    const loadInsights = async (): Promise<void> => {
        setIsLoading(true);
        try {
            // Map period to API format
            const periodMap: { [key: string]: string } = {
                'Today': 'today',
                'This Week': 'week', 
                'This Month': 'month',
                'This Year': 'year'
            };

            const apiPeriod = periodMap[selectedPeriod] || 'month';
            const days = selectedPeriod === 'Today' ? 1 : selectedPeriod === 'This Week' ? 7 : selectedPeriod === 'This Month' ? 30 : 365;
            const limit = selectedPeriod === 'Today' ? 24 : selectedPeriod === 'This Week' ? 7 : selectedPeriod === 'This Month' ? 4 : 12;

            console.log("📅 Selected Period:", selectedPeriod);
            console.log("🔗 API Period:", apiPeriod);
            console.log("📊 Days:", days, "Limit:", limit);

            const result: InsightsResult = await getDashboardInsights(days, limit, apiPeriod);
            const invoices = await getInvoices() as InvoiceRecord[];

            if (result && result.data) {
                const { summary, salesTrends, topItems } = result.data;

                const totalRevenue = summary.totalRevenue || 0;
                const pendingAmount = summary.pendingAmount || 0;

                // 🔥 BETTER X AXIS LABELS
                let labels: string[] = [];
                let salesData: number[] = [];
                let receivedData: number[] = [];

                if (salesTrends && salesTrends.length > 0) {
                    labels = salesTrends.map((t) => t.label || '');
                    salesData = salesTrends.map(t => Number(t.totalInvoiced || 0));
                    receivedData = salesTrends.map(t => Number(t.totalReceived || 0));
                    
                    console.log("📊 Backend salesTrends:", salesTrends);
                    console.log("🏷️ Generated labels:", labels);
                }

                // 🔥 ENSURE ALL DAYS SHOW FOR WEEK VIEW
                if (selectedPeriod === 'This Week') {
                    const fullWeekLabels = ['1', '2', '3', '4', '5', '6', '7'];
                    const fullWeekSales = [0, 0, 0, 0, 0, 0, 0];
                    const fullWeekReceived = [0, 0, 0, 0, 0, 0, 0];
                    
                    labels.forEach((label, index) => {
                        const dayIndex = parseInt(label) - 1;
                        if (dayIndex >= 0 && dayIndex < 7) {
                            fullWeekSales[dayIndex] = salesData[index] || 0;
                            fullWeekReceived[dayIndex] = receivedData[index] || 0;
                        }
                    });
                    
                    labels = fullWeekLabels;
                    salesData = fullWeekSales;
                    receivedData = fullWeekReceived;
                    
                    console.log("📅 Full week labels:", labels);
                    console.log("💰 Full week sales:", salesData);
                }

                // 🔥 ENSURE ALL WEEKS SHOW FOR MONTH VIEW
                if (selectedPeriod === 'This Month') {
                    const fullMonthLabels = ['W1', 'W2', 'W3', 'W4'];
                    const fullMonthSales = [0, 0, 0, 0];
                    const fullMonthReceived = [0, 0, 0, 0];
                    
                    console.log("📊 Month view - incoming labels:", labels);
                    console.log("📊 Month view - incoming sales:", salesData);
                    
                    labels.forEach((label, index) => {
                        // Parse W1, W2, W3, W4 format from backend
                        const weekMatch = label.match(/W(\d+)/);
                        if (weekMatch) {
                            const weekNum = parseInt(weekMatch[1]);
                            const weekIndex = weekNum - 1;
                            if (weekIndex >= 0 && weekIndex < 4) {
                                fullMonthSales[weekIndex] = salesData[index] || 0;
                                fullMonthReceived[weekIndex] = receivedData[index] || 0;
                                console.log(`📅 Mapped ${label} to index ${weekIndex} with value ${salesData[index]}`);
                            }
                        }
                    });
                    
                    labels = fullMonthLabels;
                    salesData = fullMonthSales;
                    receivedData = fullMonthReceived;
                    
                    console.log("📅 Final month labels:", labels);
                    console.log("💰 Final month sales:", salesData);
                }

                // 🔥 ENSURE ALL MONTHS SHOW FOR YEAR VIEW
                if (selectedPeriod === 'This Year') {
                    const fullYearLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                    const fullYearSales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    const fullYearReceived = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    
                    labels.forEach((label, index) => {
                        const monthIndex = fullYearLabels.indexOf(label);
                        if (monthIndex >= 0 && monthIndex < 12) {
                            fullYearSales[monthIndex] = salesData[index] || 0;
                            fullYearReceived[monthIndex] = receivedData[index] || 0;
                        }
                    });
                    
                    labels = fullYearLabels;
                    salesData = fullYearSales;
                    receivedData = fullYearReceived;
                    
                    console.log("📅 Full year labels:", labels);
                    console.log("💰 Full year sales:", salesData);
                }

                // 🔥 ENSURE GRAPH NEVER BREAKS
                if (salesData.length === 0) {
                    labels = selectedPeriod === 'Today' ? ['0:00'] : selectedPeriod === 'This Week' ? ['1', '2', '3', '4', '5', '6', '7'] : selectedPeriod === 'This Month' ? ['W1', 'W2', 'W3', 'W4'] : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                    salesData = selectedPeriod === 'Today' ? [0] : selectedPeriod === 'This Week' ? [0, 0, 0, 0, 0, 0, 0] : selectedPeriod === 'This Month' ? [0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    receivedData = salesData;
                }

                // 🔥 FIND HIGHEST POINT FOR Y-AXIS SCALING
                const maxSales = Math.max(...salesData);
                const maxReceived = Math.max(...receivedData);
                const maxValue = Math.max(maxSales, maxReceived);

                console.log("📈 Highest Sales:", maxSales);
                console.log("💰 Highest Received:", maxReceived);
                console.log("📊 Labels:", labels);
                console.log("🔢 Sales Data:", salesData);
                console.log("💵 Received Data:", receivedData);

                // 🔥 PERFORMANCE CALCULATION
                const last = salesData[salesData.length - 1] || 0;
                const prev = salesData[salesData.length - 2] || 0;

                const performance =
                    prev > 0
                        ? ((last - prev) / prev) * 100
                        : last > 0 ? 100 : 0;

                const invoiceList = Array.isArray(invoices) ? invoices : [];
                const invoiceCount = invoiceList.length;

                const avg =
                    invoiceCount > 0
                        ? invoiceList.reduce((sum, inv) => {
                            const amt = Number(inv.totalAmount || inv.amount || 0);
                            return sum + (isNaN(amt) ? 0 : amt);
                        }, 0) / invoiceCount
                        : 0;

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
                        labels,
                        datasets: [
                            {
                                data: salesData,
                                color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                                strokeWidth: 3,
                            },
                            {
                                data: receivedData,
                                color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
                                strokeWidth: 3,
                            }
                        ]
                    },
                    monthlyPerformance: performance,
                    averageTransactionValue: avg,
                    invoiceCount,
                });
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
            return index === 0
                ? `rgba(231, 76, 60, ${opacity})`
                : `rgba(149, 165, 166, ${opacity})`;
        },
        strokeWidth: 3,
        decimalPlaces: 0,
        
        // 🔥 Y-AXIS FORMATTING - Try different approach
        formatYLabel: (value: string) => {
            console.log("🏷️ formatYLabel called with:", value);
            const num = parseInt(value);
            if (num >= 100000) {  // 6+ digits (lakhs)
                return `${(num / 100000).toFixed(0)}L`;
            } else if (num >= 1000) {  // 4+ digits (thousands) 
                return `${(num / 1000).toFixed(0)}K`;
            }
            return num.toString();
        },

        propsForBackgroundLines: {
            stroke: "#f5f5f5",
            strokeWidth: 1,
        },
        propsForDots: {
            r: 4,
            strokeWidth: 2,
            stroke: "#fff"
        }
    };

    const hasChartData = metrics.monthlyData.datasets.some((dataset) =>
        dataset.data.some((value) => value > 0)
    ) || selectedPeriod !== 'Today'; // Always show for Week/Month/Year views

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
                    <ActivityIndicator size="large" color="#E46269" />
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
                        colors={['#E46269', '#E46269']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.topCardsGradient}
                    >
                        <View style={styles.topCardsRow}>
                            <View style={styles.topCardItem}>
                                <Text style={styles.topCardLabel}>TOTAL VALUE</Text>
                                <Text style={styles.topCardValue}>
                                    Rs.{metrics.totalSales.toLocaleString('en-IN')}
                                </Text>
                                {/* <Text style={styles.topCardSubtext}>Total Invoiced</Text> */}
                            </View>
                            <View style={styles.topCardDivider} />
                            <View style={styles.topCardItem}>
                                <Text style={styles.topCardLabel}>PAYABLE</Text>
                                <Text style={styles.topCardValue}>
                                    Rs.{metrics.totalPending.toLocaleString('en-IN')}
                                </Text>
                                {/* <Text style={styles.topCardSubtext}>Yet to Receive</Text> */}
                            </View>
                        </View>
                    </LinearGradient>

                  <View style={styles.periodsContainer}>
    {periods.map((period) => (
        <TouchableOpacity
            key={period}
            style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive
            ]}
            onPress={() => setSelectedPeriod(period)}
        >
            <Text
                style={[
                    styles.periodText,
                    selectedPeriod === period && styles.periodTextActive
                ]}
            >
                {period}
            </Text>
        </TouchableOpacity>
    ))}
</View>

                    {/* Sales vs Received Chart */}
                    <View style={styles.chartSection}>
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.sectionTitle}>Sales vs Expenses</Text>
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
                            {hasChartData ? (
                                <View style={styles.chartWrapper}>
                                    <LineChart
                                        data={metrics.monthlyData}
                                        width={width - 60}
                                        height={220}
                                        chartConfig={chartConfig}
                                        bezier
                                        style={styles.chart}
                                        withInnerLines={true}
                                        withOuterLines={false}
                                        withVerticalLines={false}
                                        withHorizontalLines={true}
                                        withVerticalLabels={true}
                                        withDots={true}
                                        withShadow={false}
                                        segments={5}
                                        yAxisInterval={1}
                                        hidePointsAtIndex={[]}
                                        verticalLabelRotation={0}
                                        formatYLabel={(value) => {
                                            const num = parseInt(value);
                                            console.log("🏷️ formatYLabel called with:", value, "num:", num);
                                            if (num >= 100000) {
                                                return `${(num / 100000).toFixed(1)}L`;
                                            } else if (num >= 1000) {
                                                return `${(num / 1000).toFixed(1)}K`;
                                            } else if (num >= 100) {
                                                return `${(num / 1000).toFixed(2)}K`; // Show as 0.50K for 500
                                            }
                                            return num.toString();
                                        }}
                                    />
                                </View>
                            ) : (
                                <View style={styles.chartEmptyState}>
                                    <Ionicons name="bar-chart-outline" size={48} color="#DDD" />
                                    <Text style={styles.emptyText}>No data available for this period</Text>
                                    <Text style={styles.emptySubtext}>Start creating invoices to see insights</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.performanceSection}>
                        <Text style={styles.sectionTitle}>Shop Performance</Text>
                     <View style={styles.performanceCard}>
    <View style={styles.performanceRow}>
        <View style={styles.performanceIconWrap}>
            <Ionicons
                name={metrics.monthlyPerformance >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={20}
                color="#6B7BFF"
            />
        </View>

        <View style={styles.performanceTextWrap}>
            <Text style={styles.performanceTitle}>Monthly Performance</Text>
            <Text style={styles.performanceSubtitle}>vs last month</Text>
        </View>

        <Text
            style={[
                styles.performanceValue,
                metrics.monthlyPerformance < 0 && styles.performanceValueNegative,
            ]}
        >
            {metrics.monthlyPerformance >= 0 ? '+' : ''}
            {metrics.monthlyPerformance.toFixed(0)}%
        </Text>
    </View>
</View>


<View style={styles.performanceCard}>
    <View style={styles.performanceRow}>
        <View style={[styles.performanceIconWrap, styles.performanceIconWrapAlt]}>
            <Ionicons name="wallet-outline" size={20} color="#FF8A50" />
        </View>

        <View style={styles.performanceTextWrap}>
            <Text style={styles.performanceTitle}>Avg Transaction Value</Text>
            <Text style={styles.performanceSubtitle}>Store Average</Text>
        </View>

        <Text style={styles.performanceValueAlt}>
            ₹{metrics.averageTransactionValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
    </View>
</View>
                    </View>

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            <Footer activeTab="Home" navigation={navigation} />
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
        // paddingBottom: 15,
        // backgroundColor: '#fff',
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
   
    periodTabActive: {
        backgroundColor: '#E46269',
    },

    periodTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    periodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
},

periodTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginHorizontal: 4,
},

periodText: {
    fontSize: 11,   // reduced size
    color: '#666',
    fontWeight: '500',
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
        flex: 1,
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
        justifyContent: 'flex-end',
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
        paddingHorizontal: 10,
        paddingTop: 16,
        paddingBottom: 10,
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
    chartWrapper: {
        position: 'relative',
    },
    axisLabelsContainer: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    yAxisLabel: {
        position: 'absolute',
        left: -5,
        top: '50%',
        transform: [{ rotate: '-90deg' }],
    },
    xAxisLabel: {
        alignItems: 'center',
    },
    axisLabelText: {
        fontSize: 10,
        color: '#999',
        fontWeight: '500',
    },
    chartEmptyState: {
        width: '100%',
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    performanceSection: {
        marginTop: 25,
        paddingHorizontal: 16,
    },
   performanceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginTop: 12,
    marginBottom: 1, // 👈 this creates space
},
    performanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    performanceIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#EEF1FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    performanceIconWrapAlt: {
        backgroundColor: '#FFF1E8',
    },
    performanceTextWrap: {
        flex: 1,
    },
    performanceTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    performanceSubtitle: {
        fontSize: 11,
        color: '#999',
    },
    performanceValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7BFF',
    },
    performanceValueNegative: {
        color: '#E46269',
    },
    performanceValueAlt: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7BFF',
    },
    performanceDivider: {
        height: 1,
        backgroundColor: '#F2F2F2',
    },
    
    emptyState: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
        marginTop: 8,
    },
    emptySubtext: {
        color: '#BBB',
        fontSize: 12,
        marginTop: 4,
    },
    bottomSpacing: {
        height: 20,
    },
});
