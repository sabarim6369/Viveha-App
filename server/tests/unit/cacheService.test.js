import { jest } from '@jest/globals';
import { getCache, setCache, deleteCache, deleteCacheByPattern } from '../../src/services/cacheService.js';
import { getRedisClient } from '../../src/config/redis.js';

// Mock the Redis client config
jest.mock('../../src/config/redis.js');

describe('CacheService', () => {
    let mockClient;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Suppress console.error during tests to keep output clean
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Setup a mock Redis client object
        mockClient = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            scan: jest.fn(),
        };

        // Make getRedisClient return our mockClient
        getRedisClient.mockReturnValue(mockClient);
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('getCache', () => {
        it('should return null if Redis client is not available', async () => {
            getRedisClient.mockReturnValue(null);
            
            const result = await getCache('testKey');
            
            expect(result).toBeNull();
        });

        it('should return parsed JSON data if key exists', async () => {
            const mockData = { id: 1, name: 'Test' };
            mockClient.get.mockResolvedValue(JSON.stringify(mockData));

            const result = await getCache('testKey');

            expect(mockClient.get).toHaveBeenCalledWith('testKey');
            expect(result).toEqual(mockData);
        });

        it('should return null if key does not exist', async () => {
            mockClient.get.mockResolvedValue(null);

            const result = await getCache('testKey');

            expect(result).toBeNull();
        });

        it('should return null and gracefully handle Redis errors', async () => {
            mockClient.get.mockRejectedValue(new Error('Redis connection failed'));

            const result = await getCache('testKey');

            expect(console.error).toHaveBeenCalled();
            expect(result).toBeNull(); // Should fallback safely
        });
    });

    describe('setCache', () => {
        it('should set data in Redis with default TTL', async () => {
            const data = { dashboard: true };
            
            await setCache('testKey', data);

            expect(mockClient.set).toHaveBeenCalledWith(
                'testKey',
                JSON.stringify(data),
                'EX',
                3600 // Default TTL
            );
        });

        it('should set data in Redis with custom TTL', async () => {
            const data = { session: 'active' };
            
            await setCache('testKey', data, 300);

            expect(mockClient.set).toHaveBeenCalledWith(
                'testKey',
                JSON.stringify(data),
                'EX',
                300
            );
        });

        it('should catch and log errors gracefully', async () => {
            mockClient.set.mockRejectedValue(new Error('Redis is down'));

            await setCache('testKey', { a: 1 });

            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('deleteCacheByPattern', () => {
        it('should delete multiple keys using SCAN', async () => {
            // First scan returns cursor '10' and two keys
            mockClient.scan.mockResolvedValueOnce(['10', ['key1', 'key2']]);
            // Second scan returns cursor '0' (end) and one key
            mockClient.scan.mockResolvedValueOnce(['0', ['key3']]);

            await deleteCacheByPattern('dashboard:*');

            // Should have scanned twice
            expect(mockClient.scan).toHaveBeenCalledTimes(2);
            expect(mockClient.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'dashboard:*', 'COUNT', 100);
            expect(mockClient.scan).toHaveBeenNthCalledWith(2, '10', 'MATCH', 'dashboard:*', 'COUNT', 100);

            // Should have deleted the keys found
            expect(mockClient.del).toHaveBeenCalledTimes(2);
            expect(mockClient.del).toHaveBeenNthCalledWith(1, 'key1', 'key2');
            expect(mockClient.del).toHaveBeenNthCalledWith(2, 'key3');
        });

        it('should handle scan returning empty key array gracefully', async () => {
            mockClient.scan.mockResolvedValueOnce(['0', []]); // No keys found

            await deleteCacheByPattern('empty:*');

            expect(mockClient.del).not.toHaveBeenCalled();
        });
    });
});
