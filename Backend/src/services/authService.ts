import jwt from 'jsonwebtoken';
import { Client, DeviceSession } from '../models/Model.js';
import { verifyOTP } from './otpService.js';
import { defaultCustomerFieldSettings } from './clientService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

interface RegisterClientParams {
    phoneNumber: string;
    otp: string | number;
    ownerName: string;
    businessName: string;
    deviceId?: string;
    shopName?: string;
    location?: string;
    city?: string;
    state?: string;
    gstin?: string;
    profileUrl?: string;
}

// Register client using OTP verification
export const registerClient = async ({
    phoneNumber,
    otp,
    ownerName,
    businessName,
    deviceId = 'registration-device',
    shopName = '',
    location = '',
    city = '',
    state = '',
    gstin = '',
    profileUrl,
}: RegisterClientParams) => {
    try {
        const existingClient = await Client.findOne({ phoneNumber });
        if (existingClient) {
            throw new Error('Phone number already registered');
        }

        await verifyOTP(phoneNumber, otp, 'register');

        const clientData: any = {
            phoneNumber,
            ownerName,
            businessName,
            shopName,
            location,
            city,
            state,
            gstin,
            isActive: true,
            clientSettings: {
                customerFields: { ...defaultCustomerFieldSettings },
            },
        };

        if (profileUrl !== undefined) {
            clientData.profileUrl = profileUrl;
        }

        const newClient = await Client.create(clientData);

        // Create an initial active device session and JWT
        const activeSession = await DeviceSession.findOneAndUpdate(
            { clientId: newClient._id, deviceId },
            {
                clientId: newClient._id,
                deviceId,
                isActive: true,
                lastSeenAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        if (!activeSession) throw new Error('Failed to create device session');

        // Deactivate any other sessions just in case
        await DeviceSession.updateMany(
            { clientId: newClient._id, _id: { $ne: activeSession._id } },
            { isActive: false },
        );

        const token = jwt.sign(
            {
                clientId: newClient._id,
                phoneNumber: newClient.phoneNumber,
                deviceSessionId: activeSession._id,
            },
            JWT_SECRET,
            { expiresIn: '30d' },
        );

        return {
            success: true,
            message: 'Client registered successfully',
            clientId: newClient._id,
            phoneNumber: newClient.phoneNumber,
            ownerName: newClient.ownerName,
            businessName: newClient.businessName,
            token,
            deviceSessionId: activeSession._id,
        };
    } catch (error: any) {
        throw new Error(error.message);
    }
};

// Login client via OTP and enforce single-device policy
export const loginClient = async (
    phoneNumber: string,
    otp: string | number,
    deviceId: string = 'default-device',
) => {
    try {
        const client = await Client.findOne({ phoneNumber });
        if (!client) {
            throw new Error('Client not found');
        }

        if (client.isActive === false) {
            throw new Error('Account is not active');
        }

        await verifyOTP(phoneNumber, otp, 'login');

        // Upsert device session for this device
        const activeSession = await DeviceSession.findOneAndUpdate(
            { clientId: client._id, deviceId },
            {
                clientId: client._id,
                deviceId,
                isActive: true,
                lastSeenAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        if (!activeSession) throw new Error('Failed to create device session');

        // Deactivate other sessions (single-device policy)
        await DeviceSession.updateMany(
            { clientId: client._id, _id: { $ne: activeSession._id } },
            { isActive: false },
        );

        const token = jwt.sign(
            {
                clientId: client._id,
                phoneNumber: client.phoneNumber,
                deviceSessionId: activeSession._id,
            },
            JWT_SECRET,
            { expiresIn: '30d' },
        );

        client.lastLoginAt = new Date();
        await client.save();

        return {
            success: true,
            message: 'OTP login successful',
            clientId: client._id,
            token,
            deviceSessionId: activeSession._id,
            phoneNumber: client.phoneNumber,
        };
    } catch (error: any) {
        throw new Error(error.message);
    }
};

// Logout client
export const logoutClient = async (clientId: string, deviceSessionId: string) => {
    try {
        const session = await DeviceSession.findOneAndUpdate(
            { _id: deviceSessionId, clientId, isActive: true },
            { isActive: false },
            { new: true },
        );

        if (!session) {
            throw new Error('Active session not found or already logged out');
        }

        return {
            success: true,
            message: 'Logout successful',
        };
    } catch (error: any) {
        throw new Error(error.message);
    }
};
