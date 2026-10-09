import { jest } from '@jest/globals';
import { createItem, getItems, updateItem, deleteItem } from '../../src/services/businessService.js';
import { Item } from '../../src/models/Item.js';
import { ItemGroup } from '../../src/models/ItemGroup.js';
import mongoose from 'mongoose';

// Mock the dependencies
jest.mock('../../src/models/Item.js');
jest.mock('../../src/models/ItemGroup.js');

describe('BusinessService - Items', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createItem', () => {
        it('should create an item successfully', async () => {
            // Arrange
            const itemData = {
                clientId: new mongoose.Types.ObjectId().toString(),
                groupId: new mongoose.Types.ObjectId().toString(),
                itemName: 'Test Item',
                salesPrice: 100,
                purchasePrice: 50,
                openingStock: 10
            };
            
            // Mock ItemGroup check
            ItemGroup.findById.mockResolvedValue({ _id: itemData.groupId, clientId: itemData.clientId });
            
            // Mock Item creation
            Item.create.mockResolvedValue({ _id: 'item123', ...itemData, currentStock: 10 });

            // Act
            const result = await createItem(itemData.clientId, itemData);

            // Assert
            expect(ItemGroup.findById).toHaveBeenCalledWith(itemData.groupId);
            expect(Item.create).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.item.itemName).toBe('Test Item');
        });

        it('should throw an error if item group does not exist', async () => {
            const itemData = {
                clientId: new mongoose.Types.ObjectId().toString(),
                groupId: new mongoose.Types.ObjectId().toString(),
                itemName: 'Test Item'
            };
            
            ItemGroup.findById.mockResolvedValue(null);

            await expect(createItem(itemData.clientId, itemData))
                .rejects
                .toThrow('Item group not found or does not belong to this client');
        });
    });

    describe('getItems', () => {
        it('should fetch all items for a client', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const mockItems = [
                { _id: 'item1', itemName: 'Item 1' },
                { _id: 'item2', itemName: 'Item 2' }
            ];
            
            Item.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockItems)
            });

            // Act
            const result = await getItems(clientId);

            // Assert
            expect(Item.find).toHaveBeenCalledWith({ clientId });
            expect(result.success).toBe(true);
            expect(result.items.length).toBe(2);
        });
    });

    describe('deleteItem', () => {
        it('should logically delete an item', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const itemId = new mongoose.Types.ObjectId().toString();
            
            const mockItem = {
                _id: itemId,
                clientId: clientId,
                isActive: true,
                save: jest.fn().mockResolvedValue(true)
            };
            
            Item.findById.mockResolvedValue(mockItem);

            // Act
            const result = await deleteItem(clientId, itemId);

            // Assert
            expect(Item.findById).toHaveBeenCalledWith(itemId);
            expect(mockItem.isActive).toBe(false);
            expect(mockItem.save).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should throw an error if trying to delete another clients item', async () => {
            const clientId = new mongoose.Types.ObjectId().toString();
            const itemId = new mongoose.Types.ObjectId().toString();
            
            const mockItem = {
                _id: itemId,
                clientId: new mongoose.Types.ObjectId().toString(), // Different client
                isActive: true
            };
            
            Item.findById.mockResolvedValue(mockItem);

            await expect(deleteItem(clientId, itemId))
                .rejects
                .toThrow('Item not found or does not belong to this client');
        });
    });
});
