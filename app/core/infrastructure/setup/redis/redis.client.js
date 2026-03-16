'use strict';

const Redis       = require('ioredis');
const redisConfig = require('./redis.config');
const { ConnectionError, InitializationError } = require('../../connection/errors');

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

let publisherInstance  = null;
let subscriberInstance = null;
let errorLogged        = false;

/**
 * RedisClient — Singleton Redis connection manager.
 *
 * Maintains two connections:
 * - publisher  : all key/value operations + pub
 * - subscriber : dedicated subscribe-mode connection (created lazily)
 *
 * Throws typed errors (ConnectionError, InitializationError) on failures so
 * ConnectionManager can handle them uniformly.
 *
 * Usage:
 *   await RedisClient.initialize();       // once at bootstrap
 *   await RedisClient.set('key', value, 60);
 *   const val = await RedisClient.get('key');
 */
class RedisClient {
  /**
   * Initialize the publisher connection and verify it with a ping.
   * Safe to call multiple times — returns the existing client if healthy.
   *
   * @returns {Promise<import('ioredis').Redis|null>}
   * @throws {InitializationError} in production when Redis is unavailable
   */
  static async initialize() {
    if (publisherInstance) return publisherInstance;

    if (!redisConfig.host || !redisConfig.port) {
      if (IS_DEVELOPMENT) {
        console.warn('[Redis] Not configured — skipping in development mode');
        return null;
      }
      throw new InitializationError('redis', 'REDIS_HOST and REDIS_PORT are required');
    }

    try {
      publisherInstance = new Redis(redisConfig);

      publisherInstance.on('connect', () => console.info('[Redis] Publisher connected'));
      publisherInstance.on('close',   () => console.warn('[Redis] Publisher connection closed'));
      publisherInstance.on('error', (err) => {
        if (errorLogged) return;
        errorLogged = true;
        // Suppress expected transient errors to avoid log spam
        if (!err.message.includes('ECONNRESET') && !err.message.includes('EADDRNOTAVAIL')) {
          console.error('[Redis] Publisher error:', err.message);
        }
      });

      await publisherInstance.connect();

      // Verify the connection is truly ready
      const pingPromise    = publisherInstance.ping();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout after 5000ms')), 5000)
      );
      await Promise.race([pingPromise, timeoutPromise]);

      console.info('[Redis] Publisher ready');
      return publisherInstance;
    } catch (err) {
      publisherInstance = null;

      if (IS_DEVELOPMENT) {
        console.warn('[Redis] Initialization failed — continuing without Redis:', err.message);
        return null;
      }

      throw new InitializationError('redis', err.message, { cause: err });
    }
  }

  /** @returns {import('ioredis').Redis|null} */
  static getInstance() {
    return publisherInstance;
  }

  /**
   * Returns the dedicated subscriber connection, connecting it explicitly.
   * @returns {import('ioredis').Redis}
   */
  static getSubscriber() {
    if (!subscriberInstance) {
      subscriberInstance = new Redis(redisConfig);
      subscriberInstance.on('connect', () => console.info('[Redis] Subscriber connected'));
      subscriberInstance.on('error',   (err) => console.error('[Redis] Subscriber error:', err.message));
      // Explicitly connect — required when lazyConnect: true
      subscriberInstance.connect().catch((err) => {
        console.error('[Redis] Subscriber connect failed:', err.message);
      });
    }
    return subscriberInstance;
  }

  /**
   * Ping the publisher. Returns null if not initialized (e.g. dev mode).
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
   * @param {*}      value
   * @param {number} [ttlSeconds]
   */
  static async set(key, value, ttlSeconds = null) {
    const client = RedisClient.getInstance();
    if (!client) return null;
    const serialized = JSON.stringify(value);
    return ttlSeconds
      ? client.set(key, serialized, 'EX', ttlSeconds)
      : client.set(key, serialized);
  }

  /**
   * Get and deserialize a value.
   * Returns null for missing keys; returns raw string if JSON parse fails
   * (tolerates values written by external tools without JSON encoding).
   *
   * @param {string} key
   * @returns {Promise<*|null>}
   */
  static async get(key) {
    const client = RedisClient.getInstance();
    if (!client) return null;
    const raw = await client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Value was stored as a plain string — return as-is
      return raw;
    }
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
    return (await client.exists(key)) > 0;
  }

  /** Gracefully close all connections. */
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
