'use strict';

const Redis = require('ioredis');
const redisConfig = require('@infrastructure/setup/configs/redis.config');

let publisherInstance = null;
let subscriberInstance = null;

/**
 * RedisClient - Singleton Redis connection manager.
 *
 * Two separate connections are maintained:
 * - publisher (default client): used for all regular operations + pub
 * - subscriber: dedicated connection required by ioredis for subscribe mode
 *
 * Usage:
 *   const client = RedisClient.getInstance();
 *   await client.set('key', 'value', 'EX', 3600);
 *
 *   const sub = RedisClient.getSubscriber();
 *   sub.subscribe('channel', handler);
 */
class RedisClient {
  /**
   * @returns {Redis} Main Redis client (commands + publish)
   */
  static getInstance() {
    if (!publisherInstance) {
      publisherInstance = new Redis(redisConfig);
      publisherInstance.on('connect', () => console.info('[Redis] Publisher connected'));
      publisherInstance.on('error', (err) => console.error('[Redis] Publisher error:', err.message));
      publisherInstance.on('close', () => console.warn('[Redis] Publisher connection closed'));
    }
    return publisherInstance;
  }

  /**
   * @returns {Redis} Subscriber-dedicated Redis client
   */
  static getSubscriber() {
    if (!subscriberInstance) {
      subscriberInstance = new Redis(redisConfig);
      subscriberInstance.on('connect', () => console.info('[Redis] Subscriber connected'));
      subscriberInstance.on('error', (err) => console.error('[Redis] Subscriber error:', err.message));
    }
    return subscriberInstance;
  }

  /**
   * Health check.
   * @returns {Promise<'PONG'>}
   */
  static async ping() {
    const result = await RedisClient.getInstance().ping();
    console.info('[Redis] Ping:', result);
    return result;
  }

  /**
   * Set a value with optional TTL.
   * @param {string} key
   * @param {*} value - Will be JSON-serialized
   * @param {number} [ttlSeconds]
   */
  static async set(key, value, ttlSeconds = null) {
    const client = RedisClient.getInstance();
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      return client.set(key, serialized, 'EX', ttlSeconds);
    }
    return client.set(key, serialized);
  }

  /**
   * Get and deserialize a value.
   * @param {string} key
   * @returns {Promise<*|null>}
   */
  static async get(key) {
    const raw = await RedisClient.getInstance().get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /**
   * Delete one or more keys.
   * @param {...string} keys
   */
  static async del(...keys) {
    return RedisClient.getInstance().del(...keys);
  }

  /**
   * Check if key exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  static async exists(key) {
    const count = await RedisClient.getInstance().exists(key);
    return count > 0;
  }

  /**
   * Gracefully close all connections.
   */
  static async disconnect() {
    if (publisherInstance) {
      await publisherInstance.quit();
      publisherInstance = null;
    }
    if (subscriberInstance) {
      await subscriberInstance.quit();
      subscriberInstance = null;
    }
    console.info('[Redis] All connections closed');
  }
}

module.exports = RedisClient;
