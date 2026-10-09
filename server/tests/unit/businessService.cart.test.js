import { jest } from '@jest/globals';
import { createCart, addItemToCart, getCart, clearCart } from '../../src/services/businessService.js';
import { Cart } from '../../src/models/Cart.js';
import { Item } from '../../src/models/Item.js';
import mongoose from 'mongoose';

jest.mock('../../src/models/Cart.js');
jest.mock('../../src/models/Item.js');

describe('BusinessService - Cart', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createCart', () => {
        it('should create a cart successfully', async () => {
            const clientId = new mongoose.Types.ObjectId().toString();
            Cart.create.mockResolvedValue({ _id: 'cart123', clientId, items: [], totalAmount: 0 });

            const result = await createCart(clientId);

            expect(Cart.create).toHaveBeenCalledWith({
                clientId,
                items: [],
                totalAmount: 0
            });
            expect(result.success).toBe(true);
            expect(result.cart._id).toBe('cart123');
        });
    });

    describe('addItemToCart', () => {
        it('should add an item to the cart and update total amount', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const cartId = new mongoose.Types.ObjectId().toString();
            const itemId = new mongoose.Types.ObjectId().toString();
            
            const mockCart = {
                _id: cartId,
                clientId: clientId,
                items: [],
                totalAmount: 0,
                save: jest.fn().mockResolvedValue(true)
            };
            
            const mockItem = {
                _id: itemId,
                clientId: clientId,
                itemName: 'Widget',
                salesPrice: 20
            };
            
            Cart.findOne.mockResolvedValue(mockCart);
            Item.findOne.mockResolvedValue(mockItem);

            // Act
            const result = await addItemToCart(clientId, cartId, itemId, 5, 20);

            // Assert
            expect(Cart.findOne).toHaveBeenCalledWith({ _id: cartId, clientId });
            expect(Item.findOne).toHaveBeenCalledWith({ _id: itemId, clientId, isActive: true });
            
            expect(mockCart.items.length).toBe(1);
            expect(mockCart.items[0].quantity).toBe(5);
            expect(mockCart.totalAmount).toBe(100); // 5 * 20
            expect(mockCart.save).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should update quantity if item already exists in cart', async () => {
            // Arrange
            const clientId = new mongoose.Types.ObjectId().toString();
            const cartId = new mongoose.Types.ObjectId().toString();
            const itemId = new mongoose.Types.ObjectId().toString();
            
            const mockCart = {
                _id: cartId,
                clientId: clientId,
                items: [
                    { productId: itemId, quantity: 2, customPrice: 20, subTotal: 40 }
                ],
                totalAmount: 40,
                save: jest.fn().mockResolvedValue(true)
            };
            
            const mockItem = { _id: itemId, clientId: clientId, itemName: 'Widget', salesPrice: 20 };
            
            Cart.findOne.mockResolvedValue(mockCart);
            Item.findOne.mockResolvedValue(mockItem);

            // Act - Add 3 more of the same item
            await addItemToCart(clientId, cartId, itemId, 3, 20);

            // Assert
            expect(mockCart.items.length).toBe(1); // Should not add a new row
            expect(mockCart.items[0].quantity).toBe(5); // 2 + 3
            expect(mockCart.items[0].subTotal).toBe(100); // 5 * 20
            expect(mockCart.totalAmount).toBe(100); // overall cart total
        });
    });
});
