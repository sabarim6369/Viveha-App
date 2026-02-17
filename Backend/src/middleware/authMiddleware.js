import jwt from 'jsonwebtoken';
import { Client, DeviceSession } from '../models/Model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// Validate bearer token, ensure session is active, and attach auth context
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const token = bearerToken || req.body?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required',
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const clientId = payload.clientId?.toString();
    const deviceSessionId = payload.deviceSessionId?.toString();

    if (!clientId || !deviceSessionId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    const [session, client] = await Promise.all([
      DeviceSession.findOne({ _id: deviceSessionId, clientId, isActive: true }),
      Client.findById(clientId),
    ]);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or logged out. Please log in again.',
      });
    }

    if (!client || client.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    session.lastSeenAt = new Date();
    await session.save();

    req.auth = {
      token,
      clientId,
      deviceSessionId,
      phoneNumber: payload.phoneNumber,
    };

    const providedClientId =
      req.body?.clientId?.toString() || req.params?.clientId?.toString();
    if (providedClientId && providedClientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client ID does not match token',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
