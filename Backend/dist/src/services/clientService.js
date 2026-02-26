import { Client } from '../models/Model.js';
export const defaultCustomerFieldSettings = {
    address: false,
    gstNo: false,
    emailId: false,
};
export const defaultTaxSettings = {
    enableTaxCalculation: false,
    primaryTaxRate: 0,
};
export const buildClientSettings = (client) => {
    const customerFields = client?.clientSettings?.customerFields || defaultCustomerFieldSettings;
    const taxSettings = client?.clientSettings?.taxSettings || defaultTaxSettings;
    return {
        customerFields: {
            ...defaultCustomerFieldSettings,
            ...customerFields,
        },
        taxSettings: {
            ...defaultTaxSettings,
            ...taxSettings,
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
    const requestedTaxSettings = updateData?.clientSettings?.taxSettings || null;
    let sanitizedCustomerFields = null;
    let sanitizedTaxSettings = null;
    // Get existing client for reference
    const existingClient = await Client.findById(clientId).select('clientSettings');
    const existingSettings = buildClientSettings(existingClient?.toObject() || {});
    if (requestedCustomerFields) {
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
    if (requestedTaxSettings) {
        const currentTaxSettings = existingSettings.taxSettings;
        const requestedTax = requestedTaxSettings;
        sanitizedTaxSettings = {
            ...existingSettings.taxSettings,
            ...Object.entries(requestedTax).reduce((acc, [key, value]) => {
                if (Object.prototype.hasOwnProperty.call(currentTaxSettings, key)) {
                    if (key === 'enableTaxCalculation') {
                        acc[key] = Boolean(value);
                    }
                    else if (key === 'primaryTaxRate') {
                        const rate = Number(value);
                        if (rate >= 0 && rate <= 100) {
                            acc[key] = rate;
                        }
                    }
                }
                return acc;
            }, {}),
        };
    }
    const sanitizedUpdate = Object.entries(updateData || {})
        .filter(([key]) => allowedFields.includes(key))
        .reduce((acc, [key, value]) => {
        if (key === 'clientSettings') {
            const settings = {};
            if (sanitizedCustomerFields) {
                settings.customerFields = sanitizedCustomerFields;
            }
            if (sanitizedTaxSettings) {
                settings.taxSettings = sanitizedTaxSettings;
            }
            if (Object.keys(settings).length > 0) {
                acc.clientSettings = settings;
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
        if (sanitizedTaxSettings) {
            client.set('clientSettings.taxSettings', sanitizedTaxSettings);
            client.markModified('clientSettings.taxSettings');
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
