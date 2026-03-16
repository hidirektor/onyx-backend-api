'use strict';

const RedisClient     = require('../setup/redis/redis.client');
const RabbitMQClient  = require('../setup/rabbitmq/rabbitmq.client');
const MinioClient     = require('../setup/storage/MinioClient');
const WebSocketServer = require('../setup/websocket/websocket.server');
const minioConfig     = require('../configs/minio.config');

const { InitializationError, ShutdownError } = require('./errors');
const { withRetry, withTimeout }              = require('./retry');

// ─── Tunables ──────────────────────────────────────────────────────────────────
const INIT_TIMEOUT_MS   = 30000;
const IS_PRODUCTION     = process.env.NODE_ENV === 'production';

/**
 * Per-service retry policy.
 * Critical services (database, Redis, RabbitMQ) get more attempts.
 * Infrastructure services (MinIO, WebSocket) get fewer.
 */
const RETRY_POLICY = {
  database:  { attempts: 5, baseDelay: 1000, maxDelay: 20000 },
  redis:     { attempts: 5, baseDelay: 500,  maxDelay: 10000 },
  rabbitmq:  { attempts: 5, baseDelay: 1000, maxDelay: 20000 },
  minio:     { attempts: 3, baseDelay: 1000, maxDelay: 10000 },
  websocket: { attempts: 2, baseDelay: 500,  maxDelay: 5000  },
};

/**
 * ConnectionManager — Centralized infrastructure lifecycle manager.
 *
 * Guarantees:
 * - Each service is initialized exactly once (idempotent).
 * - Every initialization step has a hard timeout.
 * - Every initialization step retries on failure (exponential backoff with jitter).
 * - In production, any service that exhausts all retry attempts throws
 *   `InitializationError`, which propagates to bootstrap and exits the process.
 *
 * Usage:
 *   const manager = new ConnectionManager();
 *   await manager.initializeAll(httpServer);
 *   const health = await manager.health();
 *   await manager.shutdownAll();
 */
class ConnectionManager {
  constructor() {
    this._initialized   = new Map(); // service → true
    this._pubSubClients = new Map(); // label  → { pubClient, subClient }
  }

  _mark(key)  { this._initialized.set(key, true); }
  _ready(key) { return this._initialized.get(key) === true; }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Wrap a service initialization call in retry + timeout.
   * Converts any error to `InitializationError` with the service name.
   *
   * @param {string}         service
   * @param {() => Promise}  fn
   */
  async _init(service, fn) {
    const policy = RETRY_POLICY[service] ?? { attempts: 3, baseDelay: 500, maxDelay: 10000 };

    try {
      await withRetry(
        () => withTimeout(service, fn(), INIT_TIMEOUT_MS),
        {
          label:    service,
          ...policy,
          onRetry:  (attempt, err) => {
            console.warn(`[ConnectionManager] ${service} retry ${attempt}: ${err.message}`);
          },
        }
      );
    } catch (err) {
      const wrapped = new InitializationError(service, err.message, { cause: err });

      if (IS_PRODUCTION) {
        // Fatal in production — surface immediately so bootstrap exits cleanly.
        throw wrapped;
      }

      // In non-production, log and continue so the server can still start
      // without every external service running locally.
      console.error(`[ConnectionManager] ${service} failed — continuing in non-production mode:`, err.message);
    }
  }

  // ─── Service initializers ────────────────────────────────────────────────────

  async initializeDatabase() {
    if (this._ready('database')) return;

    await this._init('database', async () => {
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

      const { sequelize } = require('@database/models');
      await sequelize.authenticate();
      console.info(`[ConnectionManager] Database "${dbConfig.database}" ready`);
    });

    this._mark('database');
  }

  async initializeRedis() {
    if (this._ready('redis')) return;

    await this._init('redis', async () => {
      await RedisClient.initialize();
      console.info('[ConnectionManager] Redis ready');
    });

    this._mark('redis');
  }

  async initializeRabbitMQ() {
    if (this._ready('rabbitmq')) return;

    await this._init('rabbitmq', async () => {
      await RabbitMQClient.connect();
      await RabbitMQClient.setupInfrastructure();
      console.info('[ConnectionManager] RabbitMQ ready');
    });

    this._mark('rabbitmq');
  }

  async initializeMinIO() {
    if (this._ready('minio')) return;

    await this._init('minio', async () => {
      await MinioClient.initialize();
      if (minioConfig.defaultBucket) {
        await MinioClient.ensureBucket(minioConfig.defaultBucket);
      }
      console.info('[ConnectionManager] MinIO ready');
    });

    this._mark('minio');
  }

  async initializeWebSocket(httpServer) {
    if (this._ready('websocket')) return;

    await this._init('websocket', async () => {
      await WebSocketServer.initialize(httpServer);
      console.info('[ConnectionManager] WebSocket ready');
    });

    this._mark('websocket');
  }

  /**
   * Initialize all services in dependency order.
   * @param {import('http').Server} httpServer
   */
  async initializeAll(httpServer) {
    await this.initializeDatabase();
    await this.initializeRedis();
    await this.initializeRabbitMQ();
    await this.initializeMinIO();
    await this.initializeWebSocket(httpServer);
  }

  // ─── Pub/Sub ─────────────────────────────────────────────────────────────────

  /**
   * Get or create a dedicated pub/sub Redis client pair by label.
   * @param {string} [label='default']
   * @returns {{ pubClient: import('ioredis').Redis, subClient: import('ioredis').Redis }|null}
   */
  getPubSubClients(label = 'default') {
    if (this._pubSubClients.has(label)) return this._pubSubClients.get(label);

    const base = RedisClient.getInstance();
    if (!base) return null;

    const entry = { pubClient: base.duplicate(), subClient: base.duplicate() };
    this._pubSubClients.set(label, entry);
    return entry;
  }

  // ─── Health ──────────────────────────────────────────────────────────────────

  /**
   * Run health checks on all services.
   * Never throws — every failure is captured as an `unhealthy` entry.
   *
   * @returns {Promise<Record<string, { status: string, service: string, error?: string }>>}
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
        ? { status: 'healthy',     service: 'redis' }
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

  // ─── Shutdown ────────────────────────────────────────────────────────────────

  /**
   * Gracefully close all connections in reverse dependency order.
   * Collects shutdown errors instead of stopping at the first one.
   */
  async shutdownAll() {
    const errors = [];

    const attempt = async (label, fn) => {
      try {
        await fn();
      } catch (err) {
        const e = new ShutdownError(label, err.message, { cause: err });
        errors.push(e);
        console.warn(`[ConnectionManager] ${label} shutdown error:`, err.message);
      }
    };

    // Reverse dependency order
    await attempt('websocket', () => WebSocketServer.close());

    for (const { pubClient, subClient } of this._pubSubClients.values()) {
      await attempt('redis:pubsub', async () => {
        if (pubClient) await pubClient.quit();
        if (subClient) await subClient.quit();
      });
    }
    this._pubSubClients.clear();

    await attempt('redis',    () => RedisClient.disconnect());
    await attempt('database', async () => {
      const { sequelize } = require('@database/models');
      await sequelize.close();
    });
    await attempt('rabbitmq', () => RabbitMQClient.disconnect());

    this._initialized.clear();

    if (errors.length > 0) {
      console.warn(`[ConnectionManager] Shutdown completed with ${errors.length} error(s)`);
    } else {
      console.info('[ConnectionManager] All connections closed cleanly');
    }
  }
}

module.exports = ConnectionManager;
