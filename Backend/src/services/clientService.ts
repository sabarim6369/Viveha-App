import { Client, IClient } from '../models/Model.js';

export interface CustomerFieldSettings {
    address: boolean;
    gstNo: boolean;
    emailId: boolean;
}

export interface TaxSettings {
    enableTaxCalculation: boolean;
    primaryTaxRate: number;
}

export const defaultCustomerFieldSettings: CustomerFieldSettings = {
    address: false,
    gstNo: false,
    emailId: false,
};

export const defaultTaxSettings: TaxSettings = {
    enableTaxCalculation: false,
    primaryTaxRate: 0,
};

export const buildClientSettings = (client: any) => {
    const customerFields =
        client?.clientSettings?.customerFields || defaultCustomerFieldSettings;
    const taxSettings =
        client?.clientSettings?.taxSettings || defaultTaxSettings;
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

interface ClientDetailsResponse {
    success: boolean;
    client: IClient | any; // Using any for flexible object return, or IClient. toObject() returns generic object.
}

// Get client details
export const getClientDetails = async (clientId: string): Promise<ClientDetailsResponse> => {
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
    } catch (error: any) {
        throw new Error(error.message);
    }
};

interface UpdateClientData {
    ownerName?: string;
    businessName?: string;
    shopName?: string;
    location?: string;
    city?: string;
    state?: string;
    gstin?: string;
    profileUrl?: string;
    clientSettings?: {
        customerFields?: Partial<CustomerFieldSettings>;
        taxSettings?: Partial<TaxSettings>;
    };
}

// Update client profile fields (immutable phone number)
export const updateClientProfile = async (clientId: string, updateData: UpdateClientData) => {
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

    const requestedCustomerFields =
        updateData?.clientSettings?.customerFields || null;
    const requestedTaxSettings =
        updateData?.clientSettings?.taxSettings || null;
    let sanitizedCustomerFields: Partial<CustomerFieldSettings> | null = null;
    let sanitizedTaxSettings: Partial<TaxSettings> | null = null;

    // Get existing client for reference
    const existingClient =
        await Client.findById(clientId).select('clientSettings');
    const existingSettings = buildClientSettings(existingClient?.toObject() || {});

    if (requestedCustomerFields) {
        // safe casting because we know the structure
        const currentFields = existingSettings.customerFields as Record<string, boolean>;
        const requestedFields = requestedCustomerFields as Record<string, boolean>;

        sanitizedCustomerFields = {
            ...existingSettings.customerFields,
            ...Object.entries(requestedFields).reduce((acc, [key, value]) => {
                if (Object.prototype.hasOwnProperty.call(currentFields, key)) {
                    acc[key as keyof CustomerFieldSettings] = Boolean(value);
                }
                return acc;
            }, {} as Partial<CustomerFieldSettings>),
        };
    }

    if (requestedTaxSettings) {
        const currentTaxSettings = existingSettings.taxSettings as Record<string, boolean | number>;
        const requestedTax = requestedTaxSettings as Record<string, boolean | number>;

        sanitizedTaxSettings = {
            ...existingSettings.taxSettings,
            ...Object.entries(requestedTax).reduce((acc, [key, value]) => {
                if (Object.prototype.hasOwnProperty.call(currentTaxSettings, key)) {
                    if (key === 'enableTaxCalculation') {
                        (acc as any)[key] = Boolean(value);
                    } else if (key === 'primaryTaxRate') {
                        const rate = Number(value);
                        if (rate >= 0 && rate <= 100) {
                            (acc as any)[key] = rate;
                        }
                    }
                }
                return acc;
            }, {} as Partial<TaxSettings>),
        };
    }

    const sanitizedUpdate = Object.entries(updateData || {})
        .filter(([key]) => allowedFields.includes(key))
        .reduce((acc, [key, value]) => {
            if (key === 'clientSettings') {
                const settings: any = {};
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
            (acc as any)[key] = value;
            return acc;
        }, {} as any);

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
                (client as any)[key] = value;
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
        (client as any).updatedAt = new Date();
        await client.save();

        const clientObject = client.toObject();
        clientObject.clientSettings = buildClientSettings(clientObject);
        return { success: true, client: clientObject };
    } catch (error: any) {
        throw new Error(error.message);
    }
};
