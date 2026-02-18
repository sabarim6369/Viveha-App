import { Client, IClient } from '../models/Model.ts';

export interface CustomerFieldSettings {
    address: boolean;
    gstNo: boolean;
    emailId: boolean;
}

export const defaultCustomerFieldSettings: CustomerFieldSettings = {
    address: false,
    gstNo: false,
    emailId: false,
};

export const buildClientSettings = (client: any) => {
    const customerFields =
        client?.clientSettings?.customerFields || defaultCustomerFieldSettings;
    return {
        customerFields: {
            ...defaultCustomerFieldSettings,
            ...customerFields,
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
    let sanitizedCustomerFields: Partial<CustomerFieldSettings> | null = null;

    if (requestedCustomerFields) {
        const existingClient =
            await Client.findById(clientId).select('clientSettings');
        const existingSettings = buildClientSettings(existingClient?.toObject() || {});

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
