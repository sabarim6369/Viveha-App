import { Client } from '../models/Client.js';
export const defaultCustomerFieldSettings = {
    address: false,
    gstNo: false,
    emailId: false,
};
export const buildClientSettings = (client) => {
    const customerFields = client?.clientSettings?.customerFields || defaultCustomerFieldSettings;
    return {
        customerFields: {
            ...defaultCustomerFieldSettings,
            ...customerFields,
        },
    };
};
// Get client details
export const getClientDetails = async (clientId) => {
    try {
        const client = await Client.findById(clientId).select('-passwordHash');
        if (!client) {
            throw new Error('Client not found');
        }
        const clientObject = client.toObject();
        clientObject.clientSettings = buildClientSettings(clientObject);
        return {
            success: true,
            client: clientObject,
        };
    }
    catch (error) {
        throw new Error(error.message);
    }
};
// Update client profile fields (immutable phone number)
export const updateClientProfile = async (clientId, updateData) => {
    const allowedFields = [
        'ownerName',
        'businessName',
        'shopName',
        'location',
        'city',
        'state',
        'gstin',
        'profileUrl',
        'clientSettings',
    ];
    const requestedCustomerFields = updateData?.clientSettings?.customerFields || null;
    let sanitizedCustomerFields = null;
    if (requestedCustomerFields) {
        const existingClient = await Client.findById(clientId).select('clientSettings');
        const existingSettings = buildClientSettings(existingClient?.toObject() || {});
        // safe casting because we know the structure
        const currentFields = existingSettings.customerFields;
        const requestedFields = requestedCustomerFields;
        sanitizedCustomerFields = {
            ...existingSettings.customerFields,
            ...Object.entries(requestedFields).reduce((acc, [key, value]) => {
                if (Object.prototype.hasOwnProperty.call(currentFields, key)) {
                    acc[key] = Boolean(value);
                }
                return acc;
            }, {}),
        };
    }
    const sanitizedUpdate = Object.entries(updateData || {})
        .filter(([key]) => allowedFields.includes(key))
        .reduce((acc, [key, value]) => {
        if (key === 'clientSettings') {
            if (sanitizedCustomerFields) {
                acc.clientSettings = {
                    customerFields: sanitizedCustomerFields,
                };
            }
            return acc;
        }
        acc[key] = value;
        return acc;
    }, {});
    if (!Object.keys(sanitizedUpdate).length) {
        throw new Error('No updates provided');
    }
    try {
        const client = await Client.findById(clientId).select('-passwordHash');
        if (!client) {
            throw new Error('Client not found');
        }
        Object.entries(sanitizedUpdate).forEach(([key, value]) => {
            if (key !== 'clientSettings') {
                client[key] = value;
            }
        });
        if (sanitizedCustomerFields) {
            client.set('clientSettings.customerFields', sanitizedCustomerFields);
            client.markModified('clientSettings.customerFields');
        }
        // client.updatedAt is handled by timestamps: true in schema, but prompt logic had it explicitly?
        // Mongoose handles updatedAt with timestamps: true option.
        // But original code had: client.updatedAt = new Date();
        // I will keep it to be safe and match behavior.
        // However, IClient interface might not have mutable updatedAt if it extends Document which has it but maybe readonly?
        // I'll cast to any to avoid issues for now.
        client.updatedAt = new Date();
        await client.save();
        const clientObject = client.toObject();
        clientObject.clientSettings = buildClientSettings(clientObject);
        return { success: true, client: clientObject };
    }
    catch (error) {
        throw new Error(error.message);
    }
};
