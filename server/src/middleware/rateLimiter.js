import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';

const redisClient = getRedisClient();

export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true, 
    legacyHeaders: false, 
    store: redisClient ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:otp:', // custom prefix
    }) : undefined,
    message: { success: false, message: 'Too many OTP requests from this IP, please try again after 15 minutes.' },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 15, // Allow slightly more attempts for login/register itself
    standardHeaders: true, 
    legacyHeaders: false, 
    store: redisClient ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:auth:',
    }) : undefined,
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
});
