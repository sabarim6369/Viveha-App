import { getRabbitChannel } from '../config/rabbitmq.js';

export const publishInvoiceGenerationTask = async (taskType, clientId, invoiceData) => {
    try {
        const channel = await getRabbitChannel();
        if (!channel) {
            throw new Error('RabbitMQ channel not available');
        }

        const message = JSON.stringify({
            taskType, // 'FROM_CART' or 'WITH_PRODUCTS'
            clientId,
            invoiceData,
            timestamp: Date.now()
        });

        // Send to queue
        const isSent = channel.sendToQueue(
            'invoice_generation_queue', 
            Buffer.from(message), 
            { persistent: true }
        );

        return isSent;
    } catch (error) {
        console.error('Failed to publish invoice generation task:', error);
        throw error;
    }
};
