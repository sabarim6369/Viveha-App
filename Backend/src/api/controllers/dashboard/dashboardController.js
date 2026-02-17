import * as dashboardService from '../../../services/dashboardService.js';

export const getDashboardSummaryController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const summary = await dashboardService.getDashboardSummary(clientId);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesTrendsController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { months } = req.query;
    const trends = await dashboardService.getSalesTrends(clientId, months);
    return res.status(200).json(trends);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopItemsController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { limit } = req.query;
    const items = await dashboardService.getTopItems(clientId, limit);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { months, limit } = req.query;
    const dashboard = await dashboardService.getDashboard(
      clientId,
      months,
      limit,
    );
    return res.status(200).json(dashboard);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
