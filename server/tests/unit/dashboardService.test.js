import { jest } from '@jest/globals';
import { getDashboardSummary, getDashboard } from '../../src/services/dashboardService.js';
import { Invoice } from '../../src/models/Invoice.js';
import * as cacheService from '../../src/services/cacheService.js';
import mongoose from 'mongoose';

// Mock the dependencies
jest.mock('../../src/models/Invoice.js');
jest.mock('../../src/services/cacheService.js');

describe('DashboardService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getDashboardSummary', () => {
        it('should return aggregated summary for a client', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const mockAggregationResult = [{
                totalSales: 10000,
                pendingAmount: 2000,
                pendingInvoices: 3
            }];
            
            Invoice.aggregate.mockResolvedValue(mockAggregationResult);

            // Act
            const result = await getDashboardSummary(clientId);

            // Assert
            expect(Invoice.aggregate).toHaveBeenCalled();
            expect(result).toEqual({
                totalSales: 10000,
                pendingAmount: 2000,
                pendingInvoices: 3
            });
        });

        it('should return default values if aggregation returns empty', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            Invoice.aggregate.mockResolvedValue([]);

            // Act
            const result = await getDashboardSummary(clientId);

            // Assert
            expect(result).toEqual({
                totalSales: 0,
                pendingAmount: 0,
                pendingInvoices: 0
            });
        });
    });

    describe('getDashboard', () => {
        it('should return cached data if it exists', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const mockCachedData = { summary: { totalSales: 5000 }, salesTrends: [], topItems: [] };
            cacheService.getCache.mockResolvedValue(mockCachedData);

            // Act
            const result = await getDashboard(clientId, 6, 5);

            // Assert
            expect(cacheService.getCache).toHaveBeenCalledWith(`dashboard:${clientId}:6:5`);
            expect(Invoice.aggregate).not.toHaveBeenCalled(); // Should not hit DB
            expect(result).toEqual(mockCachedData);
        });
        
        it('should fetch from DB and set cache if not cached', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            cacheService.getCache.mockResolvedValue(null);
            
            // We mock Invoice.aggregate generically for all 3 Promise.all calls
            Invoice.aggregate.mockResolvedValue([]);

            // Act
            const result = await getDashboard(clientId, 6, 5);

            // Assert
            expect(cacheService.getCache).toHaveBeenCalled();
            expect(Invoice.aggregate).toHaveBeenCalledTimes(3); // summary, trends, topItems
            expect(cacheService.setCache).toHaveBeenCalledWith(
                `dashboard:${clientId}:6:5`,
                expect.any(Object),
                900
            );
        });
    });
});
