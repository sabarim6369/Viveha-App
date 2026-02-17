import * as businessService from '../../../services/businessService.js';

const badRequest = (res, msg) =>
  res.status(400).json({ success: false, message: msg });
const unauthorized = (res) =>
  res.status(401).json({ success: false, message: 'Unauthorized' });
const serverError = (res, e) =>
  res
    .status(500)
    .json({ success: false, message: e.message || 'Internal error' });

export const readyToSyncController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId || req.body?.clientId || null;
    if (!clientId) return unauthorized(res);
    return res.json({ success: true, message: 'OK', clientId });
  } catch (e) {
    return serverError(res, e);
  }
};

export const syncController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId || req.body?.clientId || null;
    if (!clientId) return badRequest(res, 'clientId required');
    return res.json(await businessService.syncClientData(clientId, req.body));
  } catch (e) {
    return serverError(res, e);
  }
};
