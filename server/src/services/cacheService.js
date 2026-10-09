import { getRedisClient } from '../config/redis.js';

const DEFAULT_TTL_SECONDS = 3600; // 1 hour default

export const getCache = async (key) => {
    try {
        const client = getRedisClient();
        if (!client) return null;
        
        const data = await client.get(key);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`Cache GET error for key ${key}:`, error);
        return null; // Fallback to fetching data normally
    }
};

export const setCache = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    try {
        const client = getRedisClient();
        if (!client) return;

        const stringValue = JSON.stringify(value);
        await client.set(key, stringValue, 'EX', ttlSeconds);
    } catch (error) {
        console.error(`Cache SET error for key ${key}:`, error);
    }
};

export const deleteCache = async (key) => {
    try {
        const client = getRedisClient();
        if (!client) return;

        await client.del(key);
    } catch (error) {
        console.error(`Cache DELETE error for key ${key}:`, error);
    }
};

// Deletes multiple keys matching a pattern (e.g. "dashboard:client_id:*")
export const deleteCacheByPattern = async (pattern) => {
    try {
        const client = getRedisClient();
        if (!client) return;

        let cursor = '0';
        do {
            const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
                await client.del(...keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        console.error(`Cache DELETE PATTERN error for pattern ${pattern}:`, error);
    }
};
