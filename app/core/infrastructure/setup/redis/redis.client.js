'use strict';

const Redis       = require('ioredis');
const redisConfig = require('./redis.config');

const isDevelopment = process.env.NODE_ENV === 'development';

let publisherInstance  = null;
let subscriberInstance = null;
let errorLogged        = false;

/**
 * RedisClient - Singleton Redis connection manager.
 *
 * Two separate connections are maintained:
 * - publisher (default client): used for all regular operations + publish
 * - subscriber: dedicated connection required by ioredis for subscribe mode
 *
 * Usage:
 *   await RedisClient.initialize();          // call once during bootstrap
 *   const client = RedisClient.getInstance();
 *   await RedisClient.set('key', 'value', 3600);
 *
 *   const sub = RedisClient.getSubscriber();
 *   sub.subscribe('channel', handler);
 */
class RedisClient {
  /**
   * Initialize the publisher connection, test with a ping, and return the client.
   * Safe to call multiple times - returns existing client if healthy.
   * @returns {Promise<Redis|null>}
   */
  static async initialize() {
    if (publisherInstance) return publisherInstance;

    if (!redisConfig.host || !redisConfig.port) {
      if (isDevelopment) {
        console.warn('[Redis] Not configured — skipping in development mode');
        return null;
      }
      throw new Error('[Redis] REDIS_HOST and REDIS_PORT are required');
    }

    try {
      publisherInstance = new Redis(redisConfig);

      publisherInstance.on('connect', () => console.info('[Redis] Publisher connected'));
      publisherInstance.on('close',   () => console.warn('[Redis] Publisher connection closed'));
      publisherInstance.on('error', (err) => {
        if (errorLogged) return;
        errorLogged = true;
        if (!err.message.includes('ECONNRESET') && !err.message.includes('EADDRNOTAVAIL')) {
          console.error('[Redis] Publisher error:', err.message);
        }
      });

      // Connect explicitly (lazyConnect: true)
      await publisherInstance.connect();

      // Ping with timeout
      const pingPromise    = publisherInstance.ping();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('[Redis] Ping timeout')), 5000)
      );
      await Promise.race([pingPromise, timeoutPromise]);

      console.info('[Redis] Publisher ready');
      return publisherInstance;
    } catch (err) {
      publisherInstance = null;
      if (isDevelopment) {
        console.warn('[Redis] Initialization failed in development mode — continuing without Redis:', err.message);
        return null;
      }
      throw new Error(`[Redis] Initialization failed: ${err.message}`);
    }
  }

  /**
   * @returns {Redis|null} Main Redis client (commands + publish)
   */
  static getInstance() {
    return publisherInstance;
  }

  /**
   * @returns {Redis} Subscriber-dedicated Redis client (created lazily)
   */
  static getSubscriber() {
    if (!subscriberInstance) {
      subscriberInstance = new Redis(redisConfig);
      subscriberInstance.on('connect', () => console.info('[Redis] Subscriber connected'));
      subscriberInstance.on('error',   (err) => console.error('[Redis] Subscriber error:', err.message));
    }
    return subscriberInstance;
  }

  /**
   * Health check - pings the publisher connection.
   * @returns {Promise<'PONG'|null>}
   */
  static async ping() {
    const client = RedisClient.getInstance();
    if (!client) return null;
    return client.ping();
  }

  /**
   * Set a value with optional TTL.
   * @param {string} key
   * @param {*}      value        - Will be JSON-serialized
   * @param {number} [ttlSeconds]
   */
  static async set(key, value, ttlSeconds = null) {
    const client = RedisClient.getInstance();
    if (!client) return null;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) return client.set(key, serialized, 'EX', ttlSeconds);
    return client.set(key, serialized);
  }

  /**
   * Get and deserialize a value.
   * @param {string} key
   * @returns {Promise<*|null>}
   */
  static async get(key) {
    const client = RedisClient.getInstance();
    if (!client) return null;
    const raw = await client.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  /**
   * Delete one or more keys.
   * @param {...string} keys
   */
  static async del(...keys) {
    const client = RedisClient.getInstance();
    if (!client) return null;
    return client.del(...keys);
  }

  /**
   * Check if a key exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  static async exists(key) {
    const client = RedisClient.getInstance();
    if (!client) return false;
    const count = await client.exists(key);
    return count > 0;
  }

  /**
   * Gracefully close all connections.
   */
  static async disconnect() {
    if (publisherInstance) {
      await publisherInstance.quit().catch(() => {});
      publisherInstance = null;
    }
    if (subscriberInstance) {
      await subscriberInstance.quit().catch(() => {});
      subscriberInstance = null;
    }
    errorLogged = false;
    console.info('[Redis] All connections closed');
  }
}

module.exports = RedisClient;
