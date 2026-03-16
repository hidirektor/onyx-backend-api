'use strict';

const RedisClient     = require('../setup/redis/redis.client');
const RabbitMQClient  = require('../setup/rabbitmq/rabbitmq.client');
const MinioClient     = require('../setup/storage/MinioClient');
const WebSocketServer = require('../setup/websocket/websocket.server');
const minioConfig     = require('../configs/minio.config');

const DEFAULT_INIT_TIMEOUT_MS = 30000;

/**
 * ConnectionManager - Centralized infrastructure connection lifecycle manager.
 *
 * Tracks initialization state per service to prevent duplicate connections.
 * Each step is wrapped with a timeout to prevent hanging indefinitely.
 * Called sequentially during bootstrap to bring up all external dependencies.
 *
 * Usage in server.js:
 *   const manager = new ConnectionManager();
 *   await manager.initializeAll(httpServer);
 *   const health = await manager.health();
 *   await manager.shutdownAll();
 */
class ConnectionManager {
  constructor() {
    this._initialized   = new Map();
    this._pubSubClients = new Map(); // label → { pubClient, subClient }
  }

  _mark(key) { this._initialized.set(key, true); }
  _is(key)   { return this._initialized.get(key) === true; }

  /**
   * Wraps a promise with a timeout. Throws if the promise doesn't resolve in time.
   * @param {string}  label
   * @param {Promise} promise
   * @param {number}  [ms]
   */
  async _withTimeout(label, promise, ms = DEFAULT_INIT_TIMEOUT_MS) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`[ConnectionManager] "${label}" initialization timed out after ${ms}ms`)),
        ms
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async initializeDatabase() {
    if (this._is('database')) return;

    await this._withTimeout('database', (async () => {
      const dbConfig = require('@infrastructure/configs/database.config');
      const mysql2   = require('mysql2/promise');

      const conn = await mysql2.createConnection({
        host:     dbConfig.host,
        port:     dbConfig.port,
        user:     dbConfig.username,
        password: dbConfig.password,
      });
      try {
        await conn.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
      } finally {
        await conn.end();
      }
      console.info(`[ConnectionManager] Database "${dbConfig.database}" ensured`);

      const { sequelize } = require('@database/models');
      await sequelize.authenticate();
      console.info('[ConnectionManager] MySQL connected');
    })());

    this._mark('database');
  }

  async initializeRedis() {
    if (this._is('redis')) return;
    await this._withTimeout('redis', RedisClient.initialize());
    console.info('[ConnectionManager] Redis connected');
    this._mark('redis');
  }

  async initializeRabbitMQ() {
    if (this._is('rabbitmq')) return;
    await this._withTimeout('rabbitmq', (async () => {
      await RabbitMQClient.connect();
      await RabbitMQClient.setupInfrastructure();
    })());
    console.info('[ConnectionManager] RabbitMQ connected');
    this._mark('rabbitmq');
  }

  async initializeMinIO() {
    if (this._is('minio')) return;
    await this._withTimeout('minio', (async () => {
      await MinioClient.initialize();
      if (minioConfig.defaultBucket) {
        await MinioClient.ensureBucket(minioConfig.defaultBucket);
      }
    })());
    console.info('[ConnectionManager] MinIO ready');
    this._mark('minio');
  }

  async initializeWebSocket(httpServer) {
    if (this._is('websocket')) return;
    WebSocketServer.initialize(httpServer);
    console.info('[ConnectionManager] WebSocket initialized');
    this._mark('websocket');
  }

  /**
   * Initialize all services in the correct dependency order.
   * @param {import('http').Server} httpServer
   */
  async initializeAll(httpServer) {
    await this.initializeDatabase();
    await this.initializeRedis();
    await this.initializeRabbitMQ();
    await this.initializeMinIO();
    await this.initializeWebSocket(httpServer);
  }

  /**
   * Get or create a dedicated pub/sub Redis client pair by label.
   * Useful for WebSocket or channel-based subscriptions that must not
   * share a connection with regular command traffic.
   *
   * @param {string} [label='default']
   * @returns {{ pubClient: Redis, subClient: Redis }|null}
   */
  getPubSubClients(label = 'default') {
    if (this._pubSubClients.has(label)) {
      return this._pubSubClients.get(label);
    }

    const base = RedisClient.getInstance();
    if (!base) return null;

    const pubClient = base.duplicate();
    const subClient = base.duplicate();
    const entry     = { pubClient, subClient };
    this._pubSubClients.set(label, entry);
    return entry;
  }

  /**
   * Health check for all initialized services.
   * @returns {Promise<Record<string, {status: string, service: string, error?: string}>>}
   */
  async health() {
    const results = {};

    // Database
    try {
      const { sequelize } = require('@database/models');
      await sequelize.authenticate();
      results.database = { status: 'healthy', service: 'database' };
    } catch (err) {
      results.database = { status: 'unhealthy', service: 'database', error: err.message };
    }

    // Redis
    try {
      const pong = await RedisClient.ping();
      results.redis = pong
        ? { status: 'healthy', service: 'redis' }
        : { status: 'unavailable', service: 'redis', error: 'Client not initialized' };
    } catch (err) {
      results.redis = { status: 'unhealthy', service: 'redis', error: err.message };
    }

    // RabbitMQ
    try {
      results.rabbitmq = RabbitMQClient.healthCheck();
    } catch (err) {
      results.rabbitmq = { status: 'unhealthy', service: 'rabbitmq', error: err.message };
    }

    // MinIO
    try {
      results.minio = await MinioClient.healthCheck();
    } catch (err) {
      results.minio = { status: 'unhealthy', service: 'minio', error: err.message };
    }

    // WebSocket
    results.websocket = WebSocketServer.getHealth();

    return results;
  }

  /**
   * Gracefully close all connections in reverse dependency order.
   */
  async shutdownAll() {
    // WebSocket (stop accepting new connections first)
    try {
      await WebSocketServer.close();
    } catch (err) {
      console.warn('[ConnectionManager] WebSocket close failed:', err.message);
    }

    // Pub/Sub Redis clients
    for (const { pubClient, subClient } of this._pubSubClients.values()) {
      try { if (pubClient) await pubClient.quit(); } catch { /* ignore */ }
      try { if (subClient) await subClient.quit(); } catch { /* ignore */ }
    }
    this._pubSubClients.clear();

    // Redis
    await RedisClient.disconnect().catch((err) =>
      console.warn('[ConnectionManager] Redis close failed:', err.message)
    );

    // Database
    try {
      const { sequelize } = require('@database/models');
      await sequelize.close();
    } catch (err) {
      console.warn('[ConnectionManager] Database close failed:', err.message);
    }

    // RabbitMQ (last — messages might still be in-flight)
    await RabbitMQClient.disconnect().catch((err) =>
      console.warn('[ConnectionManager] RabbitMQ close failed:', err.message)
    );

    this._initialized.clear();
    console.info('[ConnectionManager] All connections closed');
  }
}

module.exports = ConnectionManager;
