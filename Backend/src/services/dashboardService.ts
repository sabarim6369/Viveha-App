import mongoose from 'mongoose';
import { Invoice } from '../models/Model.js';

const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const normalizeNumber = (value: any, defaultValue: number, minValue: number, maxValue: number): number => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return defaultValue;
    const bounded = Math.min(Math.max(parsed, minValue), maxValue);
    return bounded;
};

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

export const getDashboardSummary = async (clientId: string) => {
    try {
        const [summary] = await Invoice.aggregate([
            { $match: { clientId: toObjectId(clientId) } },
            {
                $project: {
                    totalAmount: 1,
                    paidAmount: { $ifNull: ['$paidAmount', 0] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }, // Total invoiced amount
                    totalReceived: { $sum: '$paidAmount' }, // Total amount received
                    pendingAmount: {
                        $sum: {
                            $cond: [
                                { $lt: ['$paidAmount', '$totalAmount'] },
                                { $subtract: ['$totalAmount', '$paidAmount'] },
                                0,
                            ],
                        },
                    },
                    pendingInvoices: {
                        $sum: {
                            $cond: [{ $lt: ['$paidAmount', '$totalAmount'] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        return {
            totalRevenue: summary?.totalRevenue || 0,
            totalReceived: summary?.totalReceived || 0,
            pendingAmount: summary?.pendingAmount || 0,
            pendingInvoices: summary?.pendingInvoices || 0,
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch dashboard summary: ${error.message}`);
    }
};

export const getSalesTrends = async (clientId: string, months: number = 6, period: string = 'month') => {
    try {
        const normalizedMonths = normalizeNumber(months, 6, 1, 24);
        const now = new Date();
        let startDate: Date;
        let groupBy: any;
        let labelFormat: string;

        if (period === 'today') {
            // Today - group by hour
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            groupBy = {
                hour: { $hour: '$generatedAt' },
            };
            labelFormat = 'hour';
        } else if (period === 'week') {
            // This Week - group by day
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6); // Last 7 days
            groupBy = {
                day: { $dayOfMonth: '$generatedAt' },
                month: { $month: '$generatedAt' },
                year: { $year: '$generatedAt' },
            };
            labelFormat = 'day';
        } else if (period === 'month') {
            // This Month - group by week
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            groupBy = {
                week: { $week: '$generatedAt' },
                month: { $month: '$generatedAt' },
                year: { $year: '$generatedAt' },
            };
            labelFormat = 'week';
        } else {
            // This Year - group by month
            startDate = new Date(now.getFullYear(), 0, 1);
            groupBy = {
                month: { $month: '$generatedAt' },
                year: { $year: '$generatedAt' },
            };
            labelFormat = 'month';
        }

        const invoicedResults = await Invoice.aggregate([
            {
                $match: {
                    clientId: toObjectId(clientId),
                    generatedAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: groupBy,
                    totalInvoiced: { $sum: '$totalAmount' },
                    totalReceived: { $sum: { $ifNull: ['$paidAmount', 0] } },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1, '_id.hour': 1 } },
        ]);

        // Format labels based on period
        const trends = invoicedResults.map((entry) => {
            let label = '';
            
            if (period === 'today') {
                label = `${entry._id.hour}:00`;
            } else if (period === 'week') {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayIndex = new Date(entry._id.year, entry._id.month - 1, entry._id.day).getDay();
                label = dayNames[dayIndex];
            } else if (period === 'month') {
                label = `W${entry._id.week}`;
            } else {
                label = MONTH_LABELS[entry._id.month - 1];
            }

            return {
                label,
                totalInvoiced: entry.totalInvoiced,
                totalReceived: entry.totalReceived,
                month: period === 'year' ? MONTH_LABELS[entry._id.month - 1] : label,
            };
        });

        return trends;
    } catch (error: any) {
        throw new Error(`Failed to fetch sales trends: ${error.message}`);
    }
};

export const getTopItems = async (clientId: string, limit: number = 5) => {
    try {
        const normalizedLimit = normalizeNumber(limit, 5, 1, 50);
        const results = await Invoice.aggregate([
            { $match: { clientId: toObjectId(clientId) } },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    itemName: { $first: '$products.itemName' },
                    quantity: { $sum: '$products.quantity' },
                    amount: {
                        $sum: {
                            $multiply: ['$products.quantity', '$products.costPerUnit'],
                        },
                    },
                },
            },
            { $sort: { amount: -1, quantity: -1 } },
            { $limit: normalizedLimit },
        ]);

        return results.map((item) => ({
            itemName: item.itemName || 'Unknown',
            quantity: item.quantity || 0,
            amount: item.amount || 0,
        }));
    } catch (error: any) {
        throw new Error(`Failed to fetch top items: ${error.message}`);
    }
};

export const getDashboard = async (clientId: string, months: number, limit: number) => {
    try {
        const [summary, salesTrends, topItems] = await Promise.all([
            getDashboardSummary(clientId),
            getSalesTrends(clientId, months),
            getTopItems(clientId, limit),
        ]);

        return {
            summary,
            salesTrends,
            topItems,
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch dashboard: ${error.message}`);
    }
};
