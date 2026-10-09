import { jest } from '@jest/globals';
import { sendOTP, verifyOTP } from '../../src/services/mockOtpService.js';
import { Client } from '../../src/models/Client.js';
import { OtpSession } from '../../src/models/OtpSession.js';
import crypto from 'crypto';

// Mock the models
jest.mock('../../src/models/Client.js');
jest.mock('../../src/models/OtpSession.js');

describe('MockOtpService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendOTP', () => {
        it('should throw an error if purpose is invalid', async () => {
            await expect(sendOTP('1234567890', 'invalid_purpose'))
                .rejects
                .toThrow('Purpose must be either register or login');
        });

        it('should throw an error if phone number is missing', async () => {
            await expect(sendOTP('', 'register'))
                .rejects
                .toThrow('Phone number is required');
        });

        it('should throw an error if trying to register an existing client', async () => {
            // Arrange
            Client.findOne.mockResolvedValue({ _id: 'client123' });

            // Act & Assert
            await expect(sendOTP('1234567890', 'register'))
                .rejects
                .toThrow('Phone number already registered');
        });

        it('should successfully generate and store OTP for a new registration', async () => {
            // Arrange
            Client.findOne.mockResolvedValue(null);
            OtpSession.deleteMany.mockResolvedValue({ deletedCount: 0 });
            OtpSession.create.mockResolvedValue({});

            // Act
            const result = await sendOTP('1234567890', 'register');

            // Assert
            expect(Client.findOne).toHaveBeenCalledWith({ phoneNumber: '1234567890' });
            expect(OtpSession.deleteMany).toHaveBeenCalledWith({ phoneNumber: '1234567890', purpose: 'register' });
            expect(OtpSession.create).toHaveBeenCalled();
            expect(result).toEqual(expect.objectContaining({
                success: true,
                message: 'OTP sent successfully',
                phoneNumber: '1234567890',
            }));
        });
    });

    describe('verifyOTP', () => {
        it('should throw an error if OTP session not found', async () => {
            OtpSession.findOne.mockResolvedValue(null);

            await expect(verifyOTP('1234567890', 1234, 'login'))
                .rejects
                .toThrow('OTP not found. Please request a new OTP');
        });

        it('should successfully verify a correct OTP', async () => {
            // Arrange
            const mockHash = crypto.createHash('sha256').update(String(1234)).digest('hex');
            const mockSession = {
                _id: 'session123',
                expiresAt: new Date(Date.now() + 10000), // Not expired
                attempts: 0,
                otpHash: mockHash,
            };
            OtpSession.findOne.mockResolvedValue(mockSession);
            OtpSession.deleteOne.mockResolvedValue({});

            // Act
            const result = await verifyOTP('1234567890', 1234, 'login', true);

            // Assert
            expect(OtpSession.deleteOne).toHaveBeenCalledWith({ _id: 'session123' });
            expect(result.success).toBe(true);
        });

        it('should throw error for incorrect OTP and increment attempts', async () => {
            // Arrange
            const validHash = crypto.createHash('sha256').update(String(1234)).digest('hex');
            const mockSession = {
                _id: 'session123',
                expiresAt: new Date(Date.now() + 10000), // Not expired
                attempts: 0,
                otpHash: validHash,
                save: jest.fn().mockResolvedValue(true)
            };
            OtpSession.findOne.mockResolvedValue(mockSession);

            // Act & Assert
            await expect(verifyOTP('1234567890', 9999, 'login'))
                .rejects
                .toThrow('Invalid OTP');

            expect(mockSession.attempts).toBe(1);
            expect(mockSession.save).toHaveBeenCalled();
        });
    });
});
