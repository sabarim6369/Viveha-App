import Redis from 'ioredis';

// Allow flexible configuration via environment variables
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;

export const connectRedis = () => {
    if (redisClient) return redisClient;

    try {
        redisClient = new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            console.log('Connected to Redis successfully');
        });

        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        return redisClient;
    } catch (error) {
        console.error('Failed to initialize Redis:', error);
        return null;
    }
};

export const getRedisClient = () => {
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
};
