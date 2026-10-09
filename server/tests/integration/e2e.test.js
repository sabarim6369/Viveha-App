import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// 1. We must mock the external services (Redis and RabbitMQ) 
// so the integration test doesn't try to connect to localhost ports.
jest.unstable_mockModule('../../src/config/redis.js', () => ({
    getRedisClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(true),
        scan: jest.fn().mockResolvedValue(['0', []])
    }),
}));

jest.unstable_mockModule('../../src/config/rabbitmq.js', () => ({
    connectRabbitMQ: jest.fn().mockResolvedValue({}),
    getRabbitChannel: jest.fn().mockResolvedValue({
        sendToQueue: jest.fn().mockReturnValue(true),
        assertQueue: jest.fn(),
        consume: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

// Mock the send OTP notification so it doesn't try to send real SMS
jest.unstable_mockModule('../../src/services/mockOtpService.js', async () => {
    const original = await import('../../src/services/mockOtpService.js');
    return {
        ...original,
        sendOTP: async (phoneNumber, purpose) => {
            // Simulate storing the OTP directly in DB to bypass real SMS
            const { Client } = await import('../../src/models/Client.js');
            const { OtpSession } = await import('../../src/models/OtpSession.js');
            const crypto = await import('crypto');
            
            let client = await Client.findOne({ phoneNumber });
            if (purpose === 'register' && client) throw new Error('Already registered');
            if (purpose === 'login' && !client) throw new Error('Client not found');
            
            const hash = crypto.createHash('sha256').update(String(1234)).digest('hex');
            await OtpSession.create({
                phoneNumber, purpose, otpHash: hash, expiresAt: new Date(Date.now() + 600000), attempts: 0
            });
            return { success: true, message: 'Mock OTP Sent' };
        }
    };
});

// Import the Express App dynamically AFTER the mocks are setup
const appModule = await import('../../index.js');
const app = appModule.default;

describe('Complete End-to-End Flow', () => {
    let mongoServer;
    let clientId;
    let authToken;

    beforeAll(async () => {
        // Spin up the in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        // Disconnect and stop the memory database
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('Step 1: Should send a mock OTP for registration', async () => {
        const res = await request(app)
            .post('/api/mockotp/send')
            .send({ phoneNumber: '9876543210', purpose: 'register' });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('Step 2: Should register a new client using the OTP', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ 
                phoneNumber: '9876543210', 
                otp: '1234', 
                ownerName: 'Integration Test User', 
                businessName: 'E2E Testing Corp'
            });
        
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.clientId).toBeDefined();
        
        clientId = res.body.clientId; // Save for later steps
    });

    it('Step 3: Should login and receive a JWT token', async () => {
        // Send OTP for login first
        await request(app)
            .post('/api/mockotp/send')
            .send({ phoneNumber: '9876543210', purpose: 'login' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ phoneNumber: '9876543210', otp: '1234' });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();

        authToken = res.body.token; // Save token for authenticated routes
    });

    it('Step 4: Should fetch the dashboard with authenticated token', async () => {
        const res = await request(app)
            .get('/api/dashboard')
            .set('Authorization', `Bearer ${authToken}`); // Inject JWT
            
        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
        // Since we just registered, sales should be 0
        expect(res.body.summary.totalSales).toBe(0); 
    });
    
    it('Step 5: Should gracefully fail to access protected routes without a token', async () => {
        const res = await request(app)
            .get('/api/dashboard');
            
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Access Denied: No token provided');
    });
});
