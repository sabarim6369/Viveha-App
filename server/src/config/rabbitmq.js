import amqp from 'amqplib';

const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
    try {
        if (connection && channel) {
            return { connection, channel };
        }

        connection = await amqp.connect(rabbitMqUrl);
        channel = await connection.createChannel();
        
        console.log('Connected to RabbitMQ successfully');
        
        // Ensure the queues exist
        await channel.assertQueue('invoice_generation_queue', { durable: true });

        connection.on('error', (err) => {
            console.error('RabbitMQ connection error:', err);
            connection = null;
            channel = null;
        });

        connection.on('close', () => {
            console.error('RabbitMQ connection closed, attempting to reconnect...');
            connection = null;
            channel = null;
            setTimeout(connectRabbitMQ, 5000);
        });

        return { connection, channel };
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        return null;
    }
};

export const getRabbitChannel = async () => {
    if (!channel) {
        await connectRabbitMQ();
    }
    return channel;
};
