import { getRabbitChannel } from '../config/rabbitmq.js';
import * as businessService from '../services/businessService.js';

export const startInvoiceWorker = async () => {
    try {
        const channel = await getRabbitChannel();
        if (!channel) {
            console.error('Worker failed to start: No RabbitMQ channel');
            return;
        }

        const queueName = 'invoice_generation_queue';
        
        // Prefetch 1 message at a time to distribute load evenly across multiple workers
        channel.prefetch(1);

        console.log(`Invoice worker listening on queue: ${queueName}`);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                try {
                    const payload = JSON.parse(msg.content.toString());
                    const { taskType, clientId, invoiceData } = payload;
                    
                    console.log(`[WORKER] Processing invoice generation for client ${clientId} (${taskType})`);

                    if (taskType === 'FROM_CART') {
                        await businessService.generateInvoice(clientId, invoiceData);
                    } else if (taskType === 'WITH_PRODUCTS') {
                        await businessService.generateInvoiceWithProduct(clientId, invoiceData);
                    } else {
                        console.error(`[WORKER] Unknown taskType: ${taskType}`);
                    }

                    console.log(`[WORKER] Successfully generated invoice for client ${clientId}`);
                    // Acknowledge the message so it's removed from the queue
                    channel.ack(msg);
                } catch (error) {
                    console.error('[WORKER] Error processing invoice generation task:', error);
                    // Reject the message and requeue it (or dead-letter it depending on business logic)
                    // We'll not requeue to avoid infinite loop on bad data for now, but in production you'd use a Dead Letter Exchange.
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        console.error('Failed to initialize invoice worker:', error);
    }
};
