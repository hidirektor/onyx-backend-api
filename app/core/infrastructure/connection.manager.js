'use strict';

const RedisClient     = require('./RedisClient');
const RabbitMQClient  = require('./RabbitMQClient');
const MinioClient     = require('./storage/MinioClient');
const WebSocketServer = require('./WebSocketServer');
const minioConfig     = require('./setup/configs/minio.config');

/**
 * ConnectionManager - Centralized infrastructure connection lifecycle manager.
 *
 * Tracks initialization state per service to prevent duplicate connections.
 * Called sequentially during bootstrap to bring up all external dependencies.
 *
 * Usage in server.js:
 *   const manager = new ConnectionManager();
 *   await manager.initializeAll(httpServer);
 *   await manager.shutdownAll();
 */
class ConnectionManager {
  constructor() {
    this._initialized = new Map();
  }

  _mark(key) { this._initialized.set(key, true); }
  _is(key)   { return this._initialized.get(key) === true; }

  async initializeDatabase() {
    if (this._is('database')) return;
    const { sequelize } = require('@database/models');
    await sequelize.authenticate();
    console.info('[ConnectionManager] MySQL connected');
    this._mark('database');
  }

  async initializeRedis() {
    if (this._is('redis')) return;
    await RedisClient.ping();
    console.info('[ConnectionManager] Redis connected');
    this._mark('redis');
  }

  async initializeRabbitMQ() {
    if (this._is('rabbitmq')) return;
    await RabbitMQClient.connect();
    console.info('[ConnectionManager] RabbitMQ connected');
    this._mark('rabbitmq');
  }

  async initializeMinIO() {
    if (this._is('minio')) return;
    await MinioClient.ensureBucket(minioConfig.defaultBucket);
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
   * Gracefully close all connections.
   */
  async shutdownAll() {
    const { sequelize } = require('@database/models');

    await sequelize.close().catch(() => {});
    await RedisClient.disconnect().catch(() => {});
    await RabbitMQClient.disconnect().catch(() => {});
    this._initialized.clear();
    console.info('[ConnectionManager] All connections closed');
  }
}

module.exports = ConnectionManager;
