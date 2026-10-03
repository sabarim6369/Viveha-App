import PageTracking from '../../models/PageTracking.js';
import mongoose from 'mongoose';
// Track page time (for future use - when frontend is ready)
export const trackPageTimeController = async (req, res) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const { pageName, timeSpent, sessionId, deviceInfo } = req.body;
        if (!pageName || timeSpent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Page name and time spent are required',
            });
        }
        const pageTracking = await PageTracking.create({
            clientId: new mongoose.Types.ObjectId(clientId),
            pageName,
            timeSpent,
            sessionId,
            deviceInfo,
            timestamp: new Date(),
        });
        return res.status(201).json({
            success: true,
            message: 'Page time tracked successfully',
            data: pageTracking,
        });
    }
    catch (error) {
        console.error('Track page time error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to track page time',
        });
    }
};
// Get insights for each user's time spent on each page
export const getPageTimeInsightsController = async (req, res) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Query parameters for filtering
        const { startDate, endDate, pageName, limit = 100 } = req.query;
        // Build query
        const query = { clientId: new mongoose.Types.ObjectId(clientId) };
        // Date range filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate);
            }
        }
        // Page name filter
        if (pageName) {
            query.pageName = pageName;
        }
        // Aggregate data by page
        const pageAggregation = await PageTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$pageName',
                    totalTimeSpent: { $sum: '$timeSpent' },
                    averageTimeSpent: { $avg: '$timeSpent' },
                    visitCount: { $sum: 1 },
                    minTimeSpent: { $min: '$timeSpent' },
                    maxTimeSpent: { $max: '$timeSpent' },
                    lastVisit: { $max: '$timestamp' },
                },
            },
            {
                $sort: { totalTimeSpent: -1 },
            },
            {
                $limit: parseInt(limit),
            },
        ]);
        // Get total statistics
        const totalStats = await PageTracking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalTimeSpent: { $sum: '$timeSpent' },
                    totalVisits: { $sum: 1 },
                    uniquePages: { $addToSet: '$pageName' },
                },
            },
        ]);
        // Get session-based insights
        const sessionInsights = await PageTracking.aggregate([
            { $match: { ...query, sessionId: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$sessionId',
                    totalTimeInSession: { $sum: '$timeSpent' },
                    pagesVisited: { $addToSet: '$pageName' },
                    pageCount: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: null,
                    averageSessionDuration: { $avg: '$totalTimeInSession' },
                    averagePagesPerSession: { $avg: '$pageCount' },
                    totalSessions: { $sum: 1 },
                },
            },
        ]);
        // Format response
        const insights = {
            success: true,
            data: {
                pageBreakdown: pageAggregation.map((page) => ({
                    pageName: page._id,
                    totalTimeSpent: page.totalTimeSpent,
                    averageTimeSpent: Math.round(page.averageTimeSpent * 100) / 100,
                    visitCount: page.visitCount,
                    minTimeSpent: page.minTimeSpent,
                    maxTimeSpent: page.maxTimeSpent,
                    lastVisit: page.lastVisit,
                })),
                overallStats: {
                    totalTimeSpent: totalStats[0]?.totalTimeSpent || 0,
                    totalVisits: totalStats[0]?.totalVisits || 0,
                    uniquePages: totalStats[0]?.uniquePages?.length || 0,
                    averageTimePerVisit: totalStats[0]?.totalVisits > 0
                        ? Math.round((totalStats[0]?.totalTimeSpent / totalStats[0]?.totalVisits) * 100) / 100
                        : 0,
                },
                sessionStats: sessionInsights[0] || {
                    averageSessionDuration: 0,
                    averagePagesPerSession: 0,
                    totalSessions: 0,
                },
            },
        };
        return res.status(200).json(insights);
    }
    catch (error) {
        console.error('Get page insights error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch page insights',
        });
    }
};
// Get detailed tracking history
export const getTrackingHistoryController = async (req, res) => {
    try {
        const clientId = req.auth?.clientId;
        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const { page = 1, limit = 50, pageName, sessionId } = req.query;
        // Build query
        const query = { clientId: new mongoose.Types.ObjectId(clientId) };
        if (pageName)
            query.pageName = pageName;
        if (sessionId)
            query.sessionId = sessionId;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [history, total] = await Promise.all([
            PageTracking.find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            PageTracking.countDocuments(query),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                history,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit),
                },
            },
        });
    }
    catch (error) {
        console.error('Get tracking history error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch tracking history',
        });
    }
};
