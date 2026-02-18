import axios, { AxiosInstance, AxiosResponse } from 'axios';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_BASE_URL = 'http://localhost:10000/api';
const CLOUD_BASE_URL = 'https://viveha-backend.onrender.com/api';
const modeArg = (process.argv[2] || '').toLowerCase();
const IS_LOCAL = modeArg === 'local';
const BASE_URL = IS_LOCAL ? LOCAL_BASE_URL : CLOUD_BASE_URL;
const MONGO_URL =
    'mongodb+srv://isaiiaiproj:qQSDkBsx3hHt5prZ@isaiidb.knox7vn.mongodb.net/vivekaDB';
const ENABLE_DB_CLEANUP = Boolean(MONGO_URL);
const TIMEOUT = 12000;
const FIXED_REGISTER_OTP = '1234';
const FIXED_LOGIN_OTP = '1234';

interface TestData {
    phoneNumber: string;
    secondaryPhone: string;
    ownerName: string;
    businessName: string;
    shopName: string;
    location: string;
    city: string;
    state: string;
    gstin: string;
    profileUrl: string;
    registerOtp: string | null;
    loginOtp: string | null;
    clientId: string | null;
    token: string | null;
    deviceSessionId: string | null;
    deviceId: string;
    itemGroupId: string | null;
    deletableItemGroupId: string | null;
    itemId: string | null;
    deletableItemId: string | null;
    clientCustomerId: string | null;
    cartId: string | null;
    cartItemId: string | null;
    invoiceId: string | null;
    pendingInvoiceId: string | null;
    syncDeleteItemId: string | null;
    syncInvoiceNumber: string | null;
    customerPhone: string;
    altCustomerPhone: string;
    settingsCustomerPhone: string;
    customerEmail: string;
    customerGstNo: string;
}

const testData: TestData = {
    phoneNumber: `989${Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, '0')}`,
    secondaryPhone: `979${Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, '0')}`,
    ownerName: 'Test Owner',
    businessName: 'Test Business',
    shopName: 'Test Auto Spares',
    location: 'Test Street, Test Area',
    city: 'Test City',
    state: 'Test State',
    gstin: '18AADCA1111K1Z5',
    profileUrl: 'https://example.com/profile.jpg',
    registerOtp: null,
    loginOtp: null,
    clientId: null,
    token: null,
    deviceSessionId: null,
    deviceId: `test-device-${Date.now()}`,
    itemGroupId: null,
    deletableItemGroupId: null,
    itemId: null,
    deletableItemId: null,
    clientCustomerId: null,
    cartId: null,
    cartItemId: null,
    invoiceId: null,
    pendingInvoiceId: null,
    syncDeleteItemId: null,
    syncInvoiceNumber: null,
    customerPhone: '9988776655',
    altCustomerPhone: '9988665544',
    settingsCustomerPhone: '9977553311',
    customerEmail: 'customer@example.com',
    customerGstNo: '22ABCDE1234F1Z5',
};

interface CreatedData {
    otpPhones: Set<string>;
    deviceSessionIds: string[];
    clients: string[];
    itemGroups: string[];
    items: string[];
    clientCustomers: string[];
    carts: string[];
    cartItems: string[];
    invoices: string[];
    invoiceItems: string[];
    payments: string[];
}

const created: CreatedData = {
    otpPhones: new Set(),
    deviceSessionIds: [],
    clients: [],
    itemGroups: [],
    items: [],
    clientCustomers: [],
    carts: [],
    cartItems: [],
    invoices: [],
    invoiceItems: [],
    payments: [],
};

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL';
    message: string;
    duration: number;
    timestamp: string;
}

interface Report {
    startTime: Date | null;
    endTime: Date | null;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    tests: TestResult[];
}

const report: Report = {
    startTime: null,
    endTime: null,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    tests: [],
};

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
});

const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message: string, type: 'success' | 'error' | 'warning' | 'info' | 'test' | 'section' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        test: '🧪',
        section: '',
    };

    const colors = {
        success: chalk.green,
        error: chalk.red,
        warning: chalk.yellow,
        info: chalk.blue,
        test: chalk.cyan,
        section: chalk.magenta,
    };

    const color = colors[type] || chalk.white;
    const icon = icons[type] || '';

    if (type === 'section') {
        console.log(color('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(color(message));
        console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    } else {
        console.log(color(`${icon} [${timestamp}] ${message}`));
    }
};

const recordTest = (name: string, status: 'PASS' | 'FAIL', message: string, duration: number) => {
    report.totalTests += 1;
    report.tests.push({
        name,
        status,
        message,
        duration,
        timestamp: new Date().toISOString(),
    });
    if (status === 'PASS') {
        report.passedTests += 1;
    } else {
        report.failedTests += 1;
    }
};

const test = async (name: string, fn: () => Promise<void>) => {
    const startTime = Date.now();
    try {
        log(`Testing: ${name}`, 'test');
        await fn();
        const duration = Date.now() - startTime;
        log(`✓ ${name} (${duration}ms)`, 'success');
        recordTest(name, 'PASS', 'Test passed', duration);
        return true;
    } catch (error: any) {
        const duration = Date.now() - startTime;
        let errorMessage = error.message;
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } else if (error.code) {
            errorMessage = `${error.code}: ${error.message}`;
        }
        log(`✗ ${name}: ${errorMessage}`, 'error');
        recordTest(name, 'FAIL', errorMessage, duration);
        return false;
    }
};

const assertEqual = (actual: any, expected: any, message: string) => {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
};

const assertTrue = (value: boolean, message: string) => {
    if (!value) {
        throw new Error(message);
    }
};

const waitForHealth = async () => {
    const healthUrl = `${BASE_URL.replace(/\/api$/, '')}/api/health`;
    for (let attempt = 1; attempt <= 40; attempt += 1) {
        try {
            await axios.get(healthUrl, { timeout: 2000 });
            log('API is healthy and reachable', 'success');
            return;
        } catch (err) {
            if (attempt % 5 === 0) {
                log(`Waiting for API... (attempt ${attempt}/40)`, 'info');
            }
            if (attempt === 40) {
                throw new Error('Server health check failed after 40 attempts');
            }
            await sleep(500);
        }
    }
};

let serverProcess: ChildProcess | null = null;

const killPort = async (port: number) => {
    try {
        log(`Killing any process on port ${port}`, 'warning');
        const findCmd = `netstat -ano | findstr :${port}`;
        const execAsync = promisify(exec);

        try {
            const { stdout } = await execAsync(findCmd);
            const lines = stdout
                .split('\n')
                .filter((line) => line.includes('LISTENING'));
            const pids = new Set<string>();

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(Number(pid))) {
                    pids.add(pid);
                }
            }

            for (const pid of pids) {
                try {
                    await execAsync(`taskkill /F /PID ${pid} /T`);
                    log(`Killed process ${pid} on port ${port}`, 'success');
                } catch (err) {
                    // Process might already be dead
                }
            }

            await sleep(1000);
        } catch (err) {
            // No process found on port, which is fine
        }
    } catch (error: any) {
        log(`Error killing port ${port}: ${error.message}`, 'warning');
    }
};

const startLocalServer = async () => {
    const backendRoot = path.join(__dirname, '..');

    // Kill any existing process on port 10000
    await killPort(10000);

    log('Starting local server for tests', 'warning');
    serverProcess = spawn('npm', ['run', 'start'], {
        cwd: backendRoot,
        shell: true,
        stdio: 'inherit',
    });
    await sleep(500);
};

const stopLocalServer = async () => {
    if (serverProcess) {
        log('Stopping local server process', 'warning');
        try {
            // On Windows, we need to kill the entire process tree
            if (serverProcess.pid) {
                const execAsync = promisify(exec);
                try {
                    await execAsync(`taskkill /F /PID ${serverProcess.pid} /T`);
                } catch (err) {
                    // Process might already be dead
                }
            }
        } catch (error: any) {
            log(`Error stopping server: ${error.message}`, 'warning');
        }
        serverProcess = null;
    }

    // Force kill port 10000 to ensure it's freed
    await killPort(10000);
    log('Local server stopped and port freed', 'success');
};

const toObjectIds = (list: (string | null)[]) =>
    list
        .filter(Boolean)
        .map((id) => {
            try {
                return new mongoose.Types.ObjectId(id as string);
            } catch (e) {
                return null;
            }
        })
        .filter((id): id is mongoose.Types.ObjectId => id !== null);

const cleanupCreatedData = async () => {
    if (!ENABLE_DB_CLEANUP) {
        log('Skipping DB cleanup (MONGO_URL not set)', 'warning');
        return;
    }
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URL);
        }
        const clientIds = toObjectIds([testData.clientId, ...created.clients]);
        const itemGroupIds = toObjectIds([...created.itemGroups]);
        const itemIds = toObjectIds([...created.items]);
        const customerIds = toObjectIds([...created.clientCustomers]);
        const cartIds = toObjectIds([...created.carts]);
        const invoiceIds = toObjectIds([...created.invoices]);
        const phoneNumbers = Array.from(created.otpPhones);
        const deviceSessionIds = toObjectIds([...created.deviceSessionIds]);

        const tasks = [];
        if (phoneNumbers.length) {
            tasks.push(
                mongoose.connection
                    .collection('otpsessions')
                    .deleteMany({ phoneNumber: { $in: phoneNumbers } }),
            );
        }
        if (deviceSessionIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('devicesessions')
                    .deleteMany({ _id: { $in: deviceSessionIds } }),
            );
        }
        if (clientIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('clients')
                    .deleteMany({ _id: { $in: clientIds } }),
            );
        }
        if (customerIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('clientcustomers')
                    .deleteMany({ _id: { $in: customerIds } }),
            );
        }
        if (itemGroupIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('itemgroups')
                    .deleteMany({ _id: { $in: itemGroupIds } }),
            );
        }
        if (itemIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('items')
                    .deleteMany({ _id: { $in: itemIds } }),
            );
        }
        if (cartIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('cartitems')
                    .deleteMany({ cartId: { $in: cartIds } }),
            );
            tasks.push(
                mongoose.connection
                    .collection('carts')
                    .deleteMany({ _id: { $in: cartIds } }),
            );
        }
        if (invoiceIds.length) {
            tasks.push(
                mongoose.connection
                    .collection('invoiceitems')
                    .deleteMany({ invoiceId: { $in: invoiceIds } }),
            );
            tasks.push(
                mongoose.connection
                    .collection('purchasehistories')
                    .deleteMany({ invoiceId: { $in: invoiceIds } }),
            );
            tasks.push(
                mongoose.connection
                    .collection('payments')
                    .deleteMany({ invoiceId: { $in: invoiceIds } }),
            );
            tasks.push(
                mongoose.connection
                    .collection('invoices')
                    .deleteMany({ _id: { $in: invoiceIds } }),
            );
        }

        await Promise.all(tasks);
        await mongoose.disconnect();
        log('Cleaned up created test data', 'success');
    } catch (error: any) {
        log(`Cleanup error: ${error.message}`, 'error');
    }
};

const tests = {
    sendOTPForRegister: async () => {
        const response = await api.post('/mockotp/send', {
            phoneNumber: testData.phoneNumber,
            purpose: 'register',
        });
        assertTrue(response.status === 200, 'Send OTP should return 200');
        assertTrue(response.data.success === true, 'Response should be successful');
        assertEqual(
            response.data.phoneNumber,
            testData.phoneNumber,
            'Phone number should match',
        );
        assertTrue(
            typeof response.data.expiresInSeconds === 'number',
            'Should include expiresInSeconds',
        );
        testData.registerOtp = FIXED_REGISTER_OTP;
        created.otpPhones.add(testData.phoneNumber);
    },

    registerClient: async () => {
        assertTrue(!!testData.registerOtp, 'OTP must be set before registration');
        const response = await api.post('/auth/register', {
            phoneNumber: testData.phoneNumber,
            otp: testData.registerOtp,
            ownerName: testData.ownerName,
            businessName: testData.businessName,
            shopName: testData.shopName,
            location: testData.location,
            city: testData.city,
            state: testData.state,
            gstin: testData.gstin,
            profileUrl: testData.profileUrl,
        });
        assertTrue(response.status === 201, 'Register should return 201');
        assertTrue(response.data.success === true, 'Registration should succeed');
        assertTrue(!!response.data.clientId, 'Response should contain clientId');
        testData.clientId = response.data.clientId;
        if (testData.clientId) created.clients.push(testData.clientId);
        testData.registerOtp = null;
    },

    sendOTPForLogin: async () => {
        const response = await api.post('/mockotp/send', {
            phoneNumber: testData.phoneNumber,
            purpose: 'login',
        });
        assertTrue(response.status === 200, 'Send OTP for login should return 200');
        assertTrue(response.data.success === true, 'Response should be successful');
        testData.loginOtp = FIXED_LOGIN_OTP;
        created.otpPhones.add(testData.phoneNumber);
    },

    loginClient: async () => {
        assertTrue(!!testData.loginOtp, 'OTP must be set before login');
        const response = await api.post('/auth/login', {
            phoneNumber: testData.phoneNumber,
            otp: testData.loginOtp,
        });
        assertTrue(response.status === 200, 'Login should return 200');
        assertTrue(response.data.success === true, 'Login should succeed');
        assertTrue(!!response.data.token, 'Response should contain token');
        assertTrue(
            !!response.data.deviceSessionId,
            'Response should contain deviceSessionId',
        );
        testData.token = response.data.token;
        testData.deviceSessionId = response.data.deviceSessionId;
        if (testData.deviceSessionId) created.deviceSessionIds.push(testData.deviceSessionId);
        setAuthToken(testData.token);
        testData.loginOtp = null;
    },

    updateClientInfo: async () => {
        const response = await api.put(`/auth/client/${testData.clientId}`, {
            ownerName: 'Updated Test Owner',
            shopName: 'Updated Test Shop',
            city: 'Updated City',
        });
        assertTrue(response.status === 200, 'Update client should return 200');
        assertTrue(response.data.success === true, 'Update client should succeed');
        assertTrue(!!response.data.client, 'Response should contain client data');
        assertEqual(
            response.data.client.ownerName,
            'Updated Test Owner',
            'Owner name should be updated',
        );
        assertEqual(
            response.data.client.shopName,
            'Updated Test Shop',
            'Shop name should be updated',
        );
        testData.ownerName = 'Updated Test Owner';
        testData.shopName = 'Updated Test Shop';
        testData.city = 'Updated City';
    },

    getClientDetails: async () => {
        const response = await api.get(`/auth/client/${testData.clientId}`);
        assertTrue(response.status === 200, 'Get client should return 200');
        assertTrue(response.data.success === true, 'Get client should succeed');
        assertTrue(!!response.data.client, 'Response should contain client data');
        assertEqual(
            response.data.client._id,
            testData.clientId,
            'Client ID should match',
        );
        assertTrue(
            response.data.client.shopName === testData.shopName,
            'Shop name should match',
        );
    },

    updateClientCustomerFieldSettings: async () => {
        const response = await api.put(`/auth/client/${testData.clientId}`, {
            clientSettings: {
                customerFields: {
                    address: true,
                    gstNo: true,
                    emailId: true,
                },
            },
        });
        assertTrue(
            response.status === 200,
            'Update client settings should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Update client settings should succeed',
        );
        assertTrue(
            !!response.data.client?.clientSettings?.customerFields,
            'Client settings should be present',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.address,
            true,
            'Address field should be enabled',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.gstNo,
            true,
            'GST field should be enabled',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.emailId,
            true,
            'Email field should be enabled',
        );
    },

    createClientCustomerMissingEnabledFields: async () => {
        let addressError = false;
        try {
            await api.post('/business/client-customers', {
                clientId: testData.clientId,
                phone: testData.settingsCustomerPhone,
                name: 'Test Customer',
                emailId: testData.customerEmail,
                gstNo: testData.customerGstNo,
            });
        } catch (error: any) {
            addressError = error.response?.status === 400;
        }
        assertTrue(addressError, 'Missing address should fail');

        let emailError = false;
        try {
            await api.post('/business/client-customers', {
                clientId: testData.clientId,
                phone: testData.settingsCustomerPhone,
                name: 'Test Customer',
                address: 'Test Address',
                gstNo: testData.customerGstNo,
            });
        } catch (error: any) {
            emailError = error.response?.status === 400;
        }
        assertTrue(emailError, 'Missing email should fail');

        let gstError = false;
        try {
            await api.post('/business/client-customers', {
                clientId: testData.clientId,
                phone: testData.settingsCustomerPhone,
                name: 'Test Customer',
                address: 'Test Address',
                emailId: testData.customerEmail,
            });
        } catch (error: any) {
            gstError = error.response?.status === 400;
        }
        assertTrue(gstError, 'Missing GST should fail');
    },

    createClientCustomerWithEnabledFields: async () => {
        const response = await api.post('/business/client-customers', {
            clientId: testData.clientId,
            phone: testData.settingsCustomerPhone,
            name: 'Test Customer',
            address: 'Test Address',
            emailId: testData.customerEmail,
            gstNo: testData.customerGstNo,
        });
        assertTrue(
            response.status === 201,
            'Create client customer with enabled fields should return 201',
        );
        assertTrue(
            response.data.success === true,
            'Create client customer with enabled fields should succeed',
        );
        assertEqual(
            response.data.clientCustomer.emailId,
            testData.customerEmail,
            'Email ID should be stored',
        );
        assertEqual(
            response.data.clientCustomer.gstNo,
            testData.customerGstNo,
            'GST number should be stored',
        );
        testData.clientCustomerId = response.data.clientCustomer._id;
        if (testData.clientCustomerId) created.clientCustomers.push(testData.clientCustomerId);
    },

    resetClientCustomerFieldSettings: async () => {
        const response = await api.put(`/auth/client/${testData.clientId}`, {
            clientSettings: {
                customerFields: {
                    address: false,
                    gstNo: false,
                    emailId: false,
                },
            },
        });
        assertTrue(
            response.status === 200,
            'Reset client settings should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Reset client settings should succeed',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.address,
            false,
            'Address field should be disabled',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.gstNo,
            false,
            'GST field should be disabled',
        );
        assertEqual(
            response.data.client.clientSettings.customerFields.emailId,
            false,
            'Email field should be disabled',
        );
    },

    createItemGroup: async () => {
        const response = await api.post('/business/item-groups', {
            clientId: testData.clientId,
            name: 'Test Item Group',
            description: 'Test group description',
        });
        assertTrue(response.status === 201, 'Create group should return 201');
        assertTrue(response.data.success === true, 'Create group should succeed');
        assertTrue(!!response.data.itemGroup._id, 'Response should contain group ID');
        testData.itemGroupId = response.data.itemGroup._id;
        if (testData.itemGroupId) created.itemGroups.push(testData.itemGroupId);
    },

    updateItemGroup: async () => {
        const response = await api.put(
            `/business/item-groups/${testData.clientId}/${testData.itemGroupId}`,
            {
                name: 'Updated Item Group',
                description: 'Updated description',
            },
        );
        assertTrue(response.status === 200, 'Update group should return 200');
        assertTrue(response.data.success === true, 'Update group should succeed');
        assertEqual(response.data.itemGroup.name, 'Updated Item Group', 'Name set');
    },

    createItemGroupToDelete: async () => {
        const response = await api.post('/business/item-groups', {
            clientId: testData.clientId,
            name: 'Temp Item Group',
            description: 'Temp description',
        });
        assertTrue(response.status === 201, 'Create group should return 201');
        testData.deletableItemGroupId = response.data.itemGroup._id;
        if (testData.deletableItemGroupId) created.itemGroups.push(testData.deletableItemGroupId);
    },

    deleteItemGroup: async () => {
        const response = await api.delete(
            `/business/item-groups/${testData.clientId}/${testData.deletableItemGroupId}`,
        );
        assertTrue(response.status === 200, 'Delete group should return 200');
        assertTrue(response.data.success === true, 'Delete group should succeed');
    },

    createItem: async () => {
        const response = await api.post('/business/items', {
            clientId: testData.clientId,
            name: 'Test Item',
            price: 100,
            unit: 'nos',
            groupId: testData.itemGroupId,
            description: 'Test item description',
        });
        assertTrue(response.status === 201, 'Create item should return 201');
        assertTrue(response.data.success === true, 'Create item should succeed');
        assertTrue(!!response.data.item._id, 'Response should contain item ID');
        testData.itemId = response.data.item._id;
        if (testData.itemId) created.items.push(testData.itemId);
    },

    updateItem: async () => {
        const response = await api.put(
            `/business/items/${testData.clientId}/${testData.itemId}`,
            {
                price: 120,
                description: 'Updated price and description',
            },
        );
        assertTrue(response.status === 200, 'Update item should return 200');
        assertTrue(response.data.success === true, 'Update item should succeed');
        assertEqual(response.data.item.price, 120, 'Price should be updated');
    },

    getItems: async () => {
        const response = await api.get(`/business/items/${testData.clientId}`);
        assertTrue(response.status === 200, 'Get items should return 200');
        assertTrue(response.data.success === true, 'Get items should succeed');
        assertTrue(
            Array.isArray(response.data.items) && response.data.items.length >= 1,
            'Response should contain items',
        );
    },

    getItemsByGroup: async () => {
        const response = await api.get(`/business/items/${testData.clientId}`, {
            params: { groupId: testData.itemGroupId },
        });
        assertTrue(response.status === 200, 'Get items by group should return 200');
        assertTrue(
            response.data.success === true,
            'Get items by group should succeed',
        );
        assertTrue(
            response.data.items.every(
                (item: any) => item.groupId === testData.itemGroupId,
            ),
            'All items should belong to the group',
        );
    },

    createItemToDelete: async () => {
        const response = await api.post('/business/items', {
            clientId: testData.clientId,
            name: 'Temp Item',
            price: 50,
            unit: 'nos',
            description: 'To be deleted',
        });
        assertTrue(response.status === 201, 'Create temp item should return 201');
        testData.deletableItemId = response.data.item._id;
        if (testData.deletableItemId) created.items.push(testData.deletableItemId);
    },

    deleteItem: async () => {
        const response = await api.delete(
            `/business/items/${testData.clientId}/${testData.deletableItemId}`,
        );
        assertTrue(response.status === 200, 'Delete item should return 200');
        assertTrue(response.data.success === true, 'Delete item should succeed');
    },

    getOrCreateCustomer: async () => {
        const response = await api.post('/business/client-customers', {
            clientId: testData.clientId,
            phone: testData.customerPhone,
            name: 'Test Customer',
        });
        assertTrue(
            response.status === 201,
            'Create client customer should return 201',
        );
        assertTrue(
            response.data.success === true,
            'Create client customer should succeed',
        );
        assertTrue(
            !!response.data.clientCustomer._id,
            'Response should contain client customer ID',
        );
        assertEqual(
            response.data.clientCustomer.address,
            '',
            'Address should default to empty string',
        );
        testData.clientCustomerId = response.data.clientCustomer._id;
        if (testData.clientCustomerId) created.clientCustomers.push(testData.clientCustomerId);
    },

    updateCustomerAddress: async () => {
        const response = await api.post('/business/client-customers', {
            clientId: testData.clientId,
            phone: testData.customerPhone,
            name: 'Test Customer',
            address: 'Updated Address Lane',
        });
        assertTrue(
            response.status === 201,
            'Update client customer should return 201',
        );
        assertTrue(
            response.data.success === true,
            'Update client customer should succeed',
        );
        assertEqual(
            response.data.clientCustomer.address,
            'Updated Address Lane',
            'Address updated',
        );
    },

    getCustomers: async () => {
        const response = await api.get(
            `/business/client-customers/${testData.clientId}`,
        );
        assertTrue(
            response.status === 200,
            'Get client customers should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Get client customers should succeed',
        );
        assertTrue(
            Array.isArray(response.data.clientCustomers),
            'Response should contain array',
        );
    },

    createCart: async () => {
        const response = await api.post('/business/carts', {
            clientId: testData.clientId,
            customerPhone: testData.customerPhone,
        });
        assertTrue(response.status === 201, 'Create cart should return 201');
        assertTrue(response.data.success === true, 'Create cart should succeed');
        assertTrue(!!response.data.cart._id, 'Response should contain cart ID');
        testData.cartId = response.data.cart._id;
        if (testData.cartId) created.carts.push(testData.cartId);
    },

    addToCart: async () => {
        const response = await api.post('/business/carts/add-item', {
            cartId: testData.cartId,
            itemId: testData.itemId,
            itemName: 'Test Item',
            unitPrice: 120,
            quantity: 5,
        });
        assertTrue(response.status === 200, 'Add to cart should return 200');
        assertTrue(response.data.success === true, 'Add to cart should succeed');
        testData.cartItemId = response.data.cartItem._id;
        if (testData.cartItemId) created.cartItems.push(testData.cartItemId);
    },

    getCart: async () => {
        const response = await api.get(`/business/carts/${testData.cartId}`);
        assertTrue(response.status === 200, 'Get cart should return 200');
        assertTrue(response.data.success === true, 'Get cart should succeed');
        assertTrue(!!response.data.cart, 'Response should contain cart data');
        assertTrue(Array.isArray(response.data.cartItems), 'Should contain items');
    },

    removeFromCart: async () => {
        const response = await api.post('/business/carts/remove-item', {
            cartId: testData.cartId,
            cartItemId: testData.cartItemId,
        });
        assertTrue(response.status === 200, 'Remove from cart should return 200');
        assertTrue(
            response.data.success === true,
            'Remove from cart should succeed',
        );
    },

    clearCart: async () => {
        const response = await api.post('/business/carts/clear', {
            cartId: testData.cartId,
        });
        assertTrue(response.status === 200, 'Clear cart should return 200');
        assertTrue(response.data.success === true, 'Clear cart should succeed');
    },

    createCartForInvoice: async () => {
        const response = await api.post('/business/carts', {
            clientId: testData.clientId,
            customerPhone: testData.customerPhone,
        });
        assertTrue(response.status === 201, 'Create cart should return 201');
        testData.cartId = response.data.cart._id;
        if (testData.cartId) created.carts.push(testData.cartId);
        const addResponse = await api.post('/business/carts/add-item', {
            cartId: testData.cartId,
            itemId: testData.itemId,
            itemName: 'Test Item',
            unitPrice: 120,
            quantity: 10,
        });
        created.cartItems.push(addResponse.data.cartItem._id);
    },

    generateInvoice: async () => {
        const response = await api.post('/business/invoices/generate', {
            clientId: testData.clientId,
            clientCustomerId: testData.clientCustomerId,
            cartId: testData.cartId,
            totalAmount: 1200,
            notes: 'Test invoice with no upfront payment',
        });
        assertTrue(response.status === 201, 'Generate invoice should return 201');
        assertTrue(
            response.data.success === true,
            'Generate invoice should succeed',
        );
        assertTrue(!!response.data.invoice._id, 'Response should contain invoice ID');
        assertTrue(
            response.data.invoice.isFinalized === false,
            'Invoice should not be finalized when unpaid',
        );
        assertEqual(
            response.data.invoice.paidAmount,
            0,
            'Unpaid invoice should start with paidAmount = 0',
        );
        testData.invoiceId = response.data.invoice._id;
        if (testData.invoiceId) created.invoices.push(testData.invoiceId);
        if (Array.isArray(response.data.invoiceItems)) {
            created.invoiceItems.push(
                ...response.data.invoiceItems.map((item: any) => item._id).filter(Boolean),
            );
        }
    },

    generateInvoiceWithProducts: async () => {
        const response = await api.post('/business/invoices/generatewithproducts', {
            clientId: testData.clientId,
            clientCustomerId: testData.clientCustomerId,
            products: [
                {
                    productId: testData.itemId,
                    itemName: 'Test Item',
                    costPerUnit: 500,
                    quantity: 2,
                },
            ],
            totalAmount: 1000,
            paidAmount: 1000,
            notes: 'Test invoice with direct products',
        });
        assertTrue(
            response.status === 201,
            'Generate invoice with products should return 201',
        );
        assertTrue(
            response.data.success === true,
            'Generate invoice with products should succeed',
        );
        assertTrue(!!response.data.invoice._id, 'Response should contain invoice ID');
        assertTrue(
            response.data.invoice.isFinalized === true,
            'Invoice should be finalized when fully paid',
        );
        assertEqual(
            response.data.invoice.paidAmount,
            1000,
            'Paid amount should match',
        );
        created.invoices.push(response.data.invoice._id);
        if (Array.isArray(response.data.invoiceItems)) {
            created.invoiceItems.push(
                ...response.data.invoiceItems.map((item: any) => item._id).filter(Boolean),
            );
        }
    },

    recordPayment1: async () => {
        const response = await api.post('/business/invoices/pay', {
            clientId: testData.clientId,
            invoiceId: testData.invoiceId,
            amount: 400,
            method: 'cash',
            note: 'First partial payment',
        });
        assertTrue(response.status === 200, 'Record payment should return 200');
        assertTrue(response.data.success === true, 'Record payment should succeed');
        assertTrue(!!response.data.invoice, 'Response should contain invoice');
        assertEqual(
            response.data.invoice.paidAmount,
            400,
            'Paid amount should be 400',
        );
        assertEqual(
            response.data.invoice.totalAmount,
            1200,
            'Invoice total should remain 1200',
        );
        if (response.data.payment?._id) {
            created.payments.push(response.data.payment._id);
        }
    },

    recordPayment2: async () => {
        const response = await api.post('/business/invoices/pay', {
            clientId: testData.clientId,
            invoiceId: testData.invoiceId,
            amount: 800,
            method: 'cash',
            note: 'Second partial payment - complete',
        });
        assertTrue(response.status === 200, 'Record payment should return 200');
        assertTrue(response.data.success === true, 'Record payment should succeed');
        assertTrue(
            response.data.invoice.isFinalized === true,
            'Invoice should be finalized after full payment',
        );
        assertEqual(
            response.data.invoice.paidAmount,
            1200,
            'Paid amount should be 1200',
        );
        assertEqual(
            response.data.invoice.totalAmount,
            1200,
            'Invoice total should remain unchanged',
        );
        if (response.data.payment?._id) {
            created.payments.push(response.data.payment._id);
        }
    },

    getPaymentsForInvoice: async () => {
        const response = await api.get(
            `/business/invoices/${testData.invoiceId}/payments?clientId=${testData.clientId}`,
        );
        assertTrue(response.status === 200, 'Get payments should return 200');
        assertTrue(response.data.success === true, 'Get payments should succeed');
        assertTrue(
            Array.isArray(response.data.payments),
            'Payments should be array',
        );
        assertTrue(response.data.payments.length >= 2, 'Should have two payments');
    },

    createPendingInvoice: async () => {
        const cartResponse = await api.post('/business/carts', {
            clientId: testData.clientId,
            customerPhone: testData.altCustomerPhone,
        });
        const cart2Id = cartResponse.data.cart._id;
        created.carts.push(cart2Id);
        const addResponse = await api.post('/business/carts/add-item', {
            cartId: cart2Id,
            itemId: testData.itemId,
            itemName: 'Test Item',
            unitPrice: 120,
            quantity: 5,
        });
        created.cartItems.push(addResponse.data.cartItem._id);
        const invoiceResponse = await api.post('/business/invoices/generate', {
            clientId: testData.clientId,
            clientCustomerId: testData.clientCustomerId,
            cartId: cart2Id,
            totalAmount: 600,
            paidAmount: 120,
            notes: 'Pending invoice for testing',
        });
        assertTrue(
            invoiceResponse.status === 201,
            'Pending invoice should return 201',
        );
        assertTrue(
            invoiceResponse.data.success === true,
            'Pending invoice should succeed',
        );
        testData.pendingInvoiceId = invoiceResponse.data.invoice._id;
        if (testData.pendingInvoiceId) created.invoices.push(testData.pendingInvoiceId);
    },

    getPendingInvoices: async () => {
        const response = await api.get(
            `/business/pending-invoices/${testData.clientId}`,
        );
        assertTrue(response.status === 200, 'Get pending should return 200');
        assertTrue(response.data.success === true, 'Get pending should succeed');
        assertTrue(
            Array.isArray(response.data.pendingInvoices),
            'Response should contain array',
        );
        const pending = response.data.pendingInvoices.find(
            (inv: any) => inv._id === testData.pendingInvoiceId,
        );
        assertTrue(Boolean(pending), 'Pending invoice should be present');
        assertEqual(pending.pendingAmount, 480, 'Pending amount should match');
    },

    getPendingInvoicesByClientCustomer: async () => {
        const response = await api.get(
            `/business/pending-invoices/${testData.clientId}/${testData.clientCustomerId}`,
        );
        assertTrue(
            response.status === 200,
            'Get pending by customer should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Get pending by customer should succeed',
        );
        assertTrue(
            Array.isArray(response.data.pendingInvoices),
            'Response should contain array',
        );
        const pending = response.data.pendingInvoices.find(
            (inv: any) => inv._id === testData.pendingInvoiceId,
        );
        assertTrue(
            Boolean(pending),
            'Pending invoice should be present for customer',
        );
    },

    getPaidInvoicesByClientCustomer: async () => {
        const response = await api.get(
            `/business/paid-invoices/${testData.clientId}/${testData.clientCustomerId}`,
        );
        assertTrue(
            response.status === 200,
            'Get paid by customer should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Get paid by customer should succeed',
        );
        assertTrue(
            Array.isArray(response.data.invoices),
            'Response should contain invoices array',
        );
        assertTrue(
            response.data.invoices.length >= 1,
            'Should include paid invoices',
        );
    },

    getPaymentReport: async () => {
        const response = await api.get(
            `/business/payment-report/${testData.clientId}`,
        );
        assertTrue(response.status === 200, 'Get report should return 200');
        assertTrue(response.data.success === true, 'Get report should succeed');
        assertTrue(!!response.data.report, 'Response should contain report');
        assertTrue(!!response.data.summary, 'Response should contain summary');
        assertTrue(
            response.data.summary.totalPending >= 0,
            'Summary should have totalPending',
        );
    },

    getPurchaseHistory: async () => {
        const response = await api.get(
            `/business/purchase-history/${testData.clientId}?clientCustomerId=${testData.clientCustomerId}`,
        );
        assertTrue(
            response.status === 200,
            'Get purchase history should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Get purchase history should succeed',
        );
        assertTrue(
            Array.isArray(response.data.purchaseHistory),
            'Response should contain array',
        );
    },

    getPurchaseHistoryByPhone: async () => {
        const response = await api.get(
            `/business/purchase-history/${testData.clientId}?clientCustomerPhone=${testData.customerPhone}`,
        );
        assertTrue(
            response.status === 200,
            'Get purchase history by phone should return 200',
        );
        assertTrue(
            response.data.success === true,
            'Get purchase history should succeed',
        );
    },

    getInvoices: async () => {
        const response = await api.get(`/business/invoices/${testData.clientId}`);
        assertTrue(response.status === 200, 'Get invoices should return 200');
        assertTrue(response.data.success === true, 'Get invoices should succeed');
        assertTrue(
            Array.isArray(response.data.invoices) &&
            response.data.invoices.length >= 2,
            'Response should contain multiple invoices',
        );
    },

    getDashboardSummary: async () => {
        const response = await api.get('/dashboard/summary');
        assertTrue(response.status === 200, 'Dashboard summary should return 200');
        assertTrue(
            typeof response.data.totalSales === 'number',
            'Summary should include totalSales',
        );
        assertTrue(
            typeof response.data.pendingAmount === 'number',
            'Summary should include pendingAmount',
        );
        assertTrue(
            typeof response.data.pendingInvoices === 'number',
            'Summary should include pendingInvoices',
        );
    },

    getDashboardSalesTrends: async () => {
        const response = await api.get('/dashboard/sales-trends?months=6');
        assertTrue(
            response.status === 200,
            'Dashboard sales trends should return 200',
        );
        assertTrue(
            Array.isArray(response.data),
            'Sales trends should return an array',
        );
        assertEqual(response.data.length, 6, 'Sales trends should have 6 months');
        response.data.forEach((entry: any) => {
            assertTrue(
                typeof entry.month === 'string',
                'Trend month should be string',
            );
            assertTrue(
                typeof entry.amount === 'number',
                'Trend amount should be number',
            );
        });
    },

    getDashboardTopItems: async () => {
        const response = await api.get('/dashboard/top-items?limit=5');
        assertTrue(
            response.status === 200,
            'Dashboard top items should return 200',
        );
        assertTrue(
            Array.isArray(response.data),
            'Top items should return an array',
        );
        assertTrue(response.data.length >= 1, 'Top items should not be empty');
        response.data.forEach((item: any) => {
            assertTrue(
                typeof item.itemName === 'string',
                'Item name should be string',
            );
            assertTrue(
                typeof item.quantity === 'number',
                'Item quantity should be number',
            );
            assertTrue(
                typeof item.amount === 'number',
                'Item amount should be number',
            );
        });
    },

    getFullDashboard: async () => {
        const response = await api.get('/dashboard');
        assertTrue(response.status === 200, 'Full dashboard should return 200');
        assertTrue(!!response.data.summary, 'Full dashboard should include summary');
        assertTrue(
            Array.isArray(response.data.salesTrends),
            'Full dashboard should include salesTrends array',
        );
        assertTrue(
            Array.isArray(response.data.topItems),
            'Full dashboard should include topItems array',
        );
    },

    readyToSync: async () => {
        const response = await api.post('/readytosync');
        assertTrue(response.status === 200, 'Ready-to-sync should return 200');
        assertTrue(response.data.success === true, 'Ready-to-sync should succeed');
        assertEqual(
            response.data.clientId,
            testData.clientId,
            'Ready-to-sync clientId should match',
        );
    },

    createSyncDeleteItem: async () => {
        const response = await api.post('/business/items', {
            clientId: testData.clientId,
            name: 'Sync Delete Item',
            price: 75,
            unit: 'nos',
            description: 'Item to delete via sync',
        });
        assertTrue(
            response.status === 201,
            'Create sync delete item should return 201',
        );
        testData.syncDeleteItemId = response.data.item._id;
        if (testData.syncDeleteItemId) created.items.push(testData.syncDeleteItemId);
    },

    syncOfflineData: async () => {
        testData.syncInvoiceNumber = `SYNC-${Date.now()}`;
        const syncPayload = {
            item: {
                create: [
                    {
                        name: 'Sync Created Item',
                        price: 210,
                        stock: 15,
                        unit: 'nos',
                        description: 'Created via sync',
                    },
                ],
                update: [
                    {
                        _id: testData.itemId,
                        price: 130,
                        stock: 25,
                    },
                ],
                delete: [testData.syncDeleteItemId],
            },
            invoice: {
                create: [
                    {
                        invoiceNumber: testData.syncInvoiceNumber,
                        clientCustomerId: testData.clientCustomerId,
                        clientCustomerName: 'Sync Customer',
                        clientCustomerPhone: testData.customerPhone,
                        products: [
                            {
                                productId: testData.itemId,
                                itemName: 'Test Item',
                                quantity: 2,
                                costPerUnit: 130,
                                itemGroup: 'Synced Group',
                            },
                        ],
                        subtotal: 260,
                        totalAmount: 260,
                        paidAmount: 0,
                        notes: 'Offline sync invoice',
                    },
                ],
            },
            payment: {
                create: [
                    {
                        invoiceId: testData.pendingInvoiceId,
                        amount: 50,
                        method: 'cash',
                        note: 'Offline payment',
                        paidAt: new Date().toISOString(),
                    },
                ],
            },
        };

        const response = await api.post('/sync', syncPayload);
        assertTrue(response.status === 200, 'Sync should return 200');
        assertTrue(response.data.success === true, 'Sync should succeed');
        assertEqual(
            response.data.message,
            'Sync completed successfully',
            'Sync response message should match',
        );
        assertTrue(!!response.data.summary, 'Sync response should include summary');
        assertTrue(!!response.data.synced, 'Sync response should include synced');
        assertTrue(!!response.data.data, 'Sync response should include data');
        assertTrue(
            Array.isArray(response.data.data.itemGroups),
            'Sync response should include itemGroups array',
        );
        assertTrue(
            Array.isArray(response.data.data.items),
            'Sync response should include items array',
        );
        assertTrue(
            Array.isArray(response.data.data.clientCustomers),
            'Sync response should include clientCustomers array',
        );
        assertTrue(
            Array.isArray(response.data.data.invoices),
            'Sync response should include invoices array',
        );
        assertTrue(
            Array.isArray(response.data.data.payments),
            'Sync response should include payments array',
        );
        assertTrue(
            Array.isArray(response.data.data.purchaseHistory),
            'Sync response should include purchaseHistory array',
        );
        assertTrue(
            Array.isArray(response.data.synced.itemsCreated),
            'Synced itemsCreated should be array',
        );
        assertTrue(
            Array.isArray(response.data.synced.itemsUpdated),
            'Synced itemsUpdated should be array',
        );
        assertTrue(
            Array.isArray(response.data.synced.itemsDeleted),
            'Synced itemsDeleted should be array',
        );
        assertTrue(
            Array.isArray(response.data.synced.invoicesCreated),
            'Synced invoicesCreated should be array',
        );
        assertTrue(
            Array.isArray(response.data.synced.paymentsCreated),
            'Synced paymentsCreated should be array',
        );
        assertEqual(
            response.data.synced.itemsCreated.length,
            response.data.summary.itemsCreated,
            'Synced itemsCreated count should match summary',
        );
        assertEqual(
            response.data.synced.itemsUpdated.length,
            response.data.summary.itemsUpdated,
            'Synced itemsUpdated count should match summary',
        );
        assertEqual(
            response.data.synced.itemsDeleted.length,
            response.data.summary.itemsDeleted,
            'Synced itemsDeleted count should match summary',
        );
        assertEqual(
            response.data.synced.invoicesCreated.length,
            response.data.summary.invoicesCreated,
            'Synced invoicesCreated count should match summary',
        );
        assertEqual(
            response.data.synced.paymentsCreated.length,
            response.data.summary.paymentsCreated,
            'Synced paymentsCreated count should match summary',
        );

        const deletedItem = response.data.data.items.find(
            (item: any) =>
                item._id === testData.syncDeleteItemId ||
                item.productId === testData.syncDeleteItemId,
        );
        assertTrue(Boolean(deletedItem), 'Deleted item should be in sync data');
        assertTrue(
            deletedItem?.isActive === false,
            'Deleted item should be inactive in sync data',
        );

        const syncedItem = response.data.data.items.find(
            (item: any) => item.name === 'Sync Created Item',
        );
        if (syncedItem?._id) {
            created.items.push(syncedItem._id);
        }
        const syncedInvoice = response.data.data.invoices.find(
            (invoice: any) => invoice.invoiceNumber === testData.syncInvoiceNumber,
        );
        if (syncedInvoice?._id) {
            created.invoices.push(syncedInvoice._id);
        }
    },

    logoutClient: async () => {
        const response = await api.post('/auth/logout', {
            clientId: testData.clientId,
            deviceSessionId: testData.deviceSessionId,
        });
        assertTrue(response.status === 200, 'Logout should return 200');
        assertTrue(response.data.success === true, 'Logout should succeed');
        setAuthToken(null);
    },
};

const printReportSummary = () => {
    const reportEndTime = report.endTime || new Date();
    const startTimeSafe = report.startTime || new Date();

    const duration = ((reportEndTime.getTime() - startTimeSafe.getTime()) / 1000).toFixed(2);
    const passPercentage = (
        (report.passedTests / report.totalTests) * 100 || 0
    ).toFixed(2);
    console.log(
        '\n' + chalk.cyan('═══════════════════════════════════════════════════'),
    );
    console.log(chalk.cyan('TEST REPORT SUMMARY'));
    console.log(
        chalk.cyan('═══════════════════════════════════════════════════'),
    );
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(chalk.green(`✅ Passed: ${report.passedTests}`));
    console.log(chalk.red(`❌ Failed: ${report.failedTests}`));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Pass Rate: ${passPercentage}%`);
    console.log(
        chalk.cyan('═══════════════════════════════════════════════════\n'),
    );
};

const runAllTests = async () => {
    report.startTime = new Date();
    log('Starting Viveka Backend API Test Suite', 'section');
    log(`Mode: ${IS_LOCAL ? 'LOCAL' : 'CLOUD'}`, 'info');
    log(`Base URL: ${BASE_URL}`, 'info');
    log(`Test Phone: ${testData.phoneNumber}`, 'info');
    log(`DB Cleanup: ${ENABLE_DB_CLEANUP ? 'ENABLED' : 'DISABLED'}`, 'info');
    let fatalError = null;
    try {
        if (IS_LOCAL) {
            await startLocalServer();
        }
        await waitForHealth();
        log('Running API Tests', 'section');
        await test('1. Send OTP (register)', tests.sendOTPForRegister);
        await test('2. Register Client', tests.registerClient);
        await test('3. Send OTP (login)', tests.sendOTPForLogin);
        await test('4. Login Client', tests.loginClient);
        await test('5. Update Client Info', tests.updateClientInfo);
        await test('6. Get Client Details', tests.getClientDetails);
        await test(
            '6a. Update Client Customer Field Settings',
            tests.updateClientCustomerFieldSettings,
        );
        await test(
            '6b. Create Client Customer (Missing Enabled Fields)',
            tests.createClientCustomerMissingEnabledFields,
        );
        await test(
            '6c. Create Client Customer (With Enabled Fields)',
            tests.createClientCustomerWithEnabledFields,
        );
        await test(
            '6d. Reset Client Customer Field Settings',
            tests.resetClientCustomerFieldSettings,
        );
        await test('7. Create Item Group', tests.createItemGroup);
        await test('8. Update Item Group', tests.updateItemGroup);
        await test('9. Create Temp Item Group', tests.createItemGroupToDelete);
        await test('10. Delete Temp Item Group', tests.deleteItemGroup);
        await test('11. Create Item', tests.createItem);
        await test('12. Update Item', tests.updateItem);
        await test('13. Get Items', tests.getItems);
        await test('14. Get Items By Group', tests.getItemsByGroup);
        await test('15. Create Temp Item', tests.createItemToDelete);
        await test('16. Delete Temp Item', tests.deleteItem);
        await test('17. Create Client Customer', tests.getOrCreateCustomer);
        await test(
            '18. Update Client Customer Address',
            tests.updateCustomerAddress,
        );
        await test('19. Get Client Customers', tests.getCustomers);
        await test('20. Create Cart', tests.createCart);
        await test('21. Add To Cart', tests.addToCart);
        await test('22. Get Cart', tests.getCart);
        await test('23. Remove From Cart', tests.removeFromCart);
        await test('24. Clear Cart', tests.clearCart);
        await test('25. Create Cart For Invoice', tests.createCartForInvoice);
        await test('26. Generate Invoice (unpaid)', tests.generateInvoice);
        await test(
            '27. Generate Invoice With Products',
            tests.generateInvoiceWithProducts,
        );
        await test('28. Record Payment 1', tests.recordPayment1);
        await test('29. Record Payment 2', tests.recordPayment2);
        await test('30. Get Payments For Invoice', tests.getPaymentsForInvoice);
        await test('31. Create Pending Invoice', tests.createPendingInvoice);
        await test('32. Get Pending Invoices', tests.getPendingInvoices);
        await test(
            '33. Get Pending Invoices By Customer',
            tests.getPendingInvoicesByClientCustomer,
        );
        await test(
            '34. Get Paid Invoices By Customer',
            tests.getPaidInvoicesByClientCustomer,
        );
        await test('35. Get Payment Report', tests.getPaymentReport);
        await test('36. Get Purchase History', tests.getPurchaseHistory);
        await test(
            '37. Get Purchase History By Phone',
            tests.getPurchaseHistoryByPhone,
        );
        await test('38. Get All Invoices', tests.getInvoices);
        await test('39. Get Dashboard Summary', tests.getDashboardSummary);
        await test('40. Get Dashboard Sales Trends', tests.getDashboardSalesTrends);
        await test('41. Get Dashboard Top Items', tests.getDashboardTopItems);
        await test('42. Get Full Dashboard', tests.getFullDashboard);
        await test('43. Ready To Sync', tests.readyToSync);
        await test('44. Create Sync Delete Item', tests.createSyncDeleteItem);
        await test('45. Sync Offline Data', tests.syncOfflineData);
        await test('46. Logout Client', tests.logoutClient);
    } catch (error: any) {
        fatalError = error;
        log(`Fatal Error: ${error.message}`, 'error');
    } finally {
        report.endTime = new Date();
        await cleanupCreatedData();
        if (IS_LOCAL) {
            await stopLocalServer();
        }
        printReportSummary();
        if (fatalError) {
            process.exit(1);
        }
        process.exit(report.failedTests > 0 ? 1 : 0);
    }
};

runAllTests().catch((error) => {
    log(`Unhandled error: ${error.message}`, 'error');
    cleanupCreatedData()
        .catch((cleanupError) =>
            log(`Cleanup failure: ${cleanupError.message}`, 'error'),
        )
        .finally(() => process.exit(1));
});
