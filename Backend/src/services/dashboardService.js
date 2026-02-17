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

const normalizeNumber = (value, defaultValue, minValue, maxValue) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  const bounded = Math.min(Math.max(parsed, minValue), maxValue);
  return bounded;
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

export const getDashboardSummary = async (clientId) => {
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
          totalSales: {
            $sum: {
              $cond: [
                { $gte: ['$paidAmount', '$totalAmount'] },
                '$totalAmount',
                0,
              ],
            },
          },
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
      totalSales: summary?.totalSales || 0,
      pendingAmount: summary?.pendingAmount || 0,
      pendingInvoices: summary?.pendingInvoices || 0,
    };
  } catch (error) {
    throw new Error(`Failed to fetch dashboard summary: ${error.message}`);
  }
};

export const getSalesTrends = async (clientId, months = 6) => {
  try {
    const normalizedMonths = normalizeNumber(months, 6, 1, 24);
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startMonth.setMonth(startMonth.getMonth() - (normalizedMonths - 1));

    const results = await Invoice.aggregate([
      {
        $match: {
          clientId: toObjectId(clientId),
          generatedAt: { $gte: startMonth },
          $expr: { $gte: ['$paidAmount', '$totalAmount'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$generatedAt' },
            month: { $month: '$generatedAt' },
          },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalsByMonth = new Map(
      results.map((entry) => [
        `${entry._id.year}-${entry._id.month}`,
        entry.amount,
      ]),
    );

    const trends = [];
    for (let i = normalizedMonths - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      trends.push({
        month: MONTH_LABELS[date.getMonth()],
        amount: totalsByMonth.get(key) || 0,
      });
    }

    return trends;
  } catch (error) {
    throw new Error(`Failed to fetch sales trends: ${error.message}`);
  }
};

export const getTopItems = async (clientId, limit = 5) => {
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
  } catch (error) {
    throw new Error(`Failed to fetch top items: ${error.message}`);
  }
};

export const getDashboard = async (clientId, months, limit) => {
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
  } catch (error) {
    throw new Error(`Failed to fetch dashboard: ${error.message}`);
  }
};
