'use strict';

const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    if (isDevelopment) return null;
    if (times >= 5) return null;
    return Math.min(times * 250, 3000);
  },
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  connectTimeout: 8000,
  commandTimeout: 12000,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  enableOfflineQueue: false,
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'EADDRNOTAVAIL', 'ETIMEDOUT'];
    return targetErrors.some((type) => err.message.includes(type));
  },
  connectionName: `onyx-backend-${process.env.NODE_ENV || 'dev'}`,
  enableAutoPipelining: false,
};
