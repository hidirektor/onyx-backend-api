'use strict';

const amqp         = require('amqplib');
const rabbitConfig = require('./rabbitmq.config');
const { ConnectionError, InitializationError } = require('../../connection/errors');
const { backoff, sleep }                        = require('../../connection/retry');

let connection        = null;
let isConnected       = false;
const channels        = new Map(); // workerType → { ch, closed }
let publisherChannel  = null;
let publisherClosed   = false;
let reconnectTimer    = null;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * RabbitMQClient — Singleton AMQP connection and multi-channel manager.
 *
 * - One channel per worker type (mail, sms, push, inApp) with configurable prefetch.
 * - Separate persistent publisher channel for all outbound messages.
 * - Automatic reconnect with exponential backoff (max MAX_RECONNECT_ATTEMPTS).
 * - Full DLX/DLQ infrastructure setup on first connect.
 * - Throws typed errors (ConnectionError, InitializationError) on failures.
 */
class RabbitMQClient {
  /**
   * Establish connection. Safe to call multiple times.
   * @returns {Promise<import('amqplib').Connection>}
   * @throws {ConnectionError}
   */
  static async connect() {
    if (isConnected && connection) return connection;

    try {
      connection = await amqp.connect(rabbitConfig.url, {
        heartbeat: rabbitConfig.connection.heartbeat,
        timeout:   rabbitConfig.connection.connectionTimeout,
      });

      isConnected       = true;
      reconnectAttempts = 0;
      console.info('[RabbitMQ] Connected');

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed — scheduling reconnect');
        isConnected      = false;
        publisherChannel = null;
        publisherClosed  = false;
        channels.clear();
        connection = null;
        RabbitMQClient._scheduleReconnect();
      });

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
        isConnected = false;
      });

      return connection;
    } catch (err) {
      isConnected = false;
      connection  = null;
      RabbitMQClient._scheduleReconnect();
      throw new ConnectionError('rabbitmq', err.message, { cause: err });
    }
  }

  static _scheduleReconnect() {
    if (reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[RabbitMQ] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached — giving up`);
      return;
    }

    reconnectAttempts++;
    const delay = backoff(reconnectAttempts, 1000, 30000);
    console.warn(`[RabbitMQ] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        await RabbitMQClient.connect();
      } catch {
        // next 'close' event will trigger another attempt
      }
    }, delay);
  }

  /**
   * Get or create a channel for a worker type with appropriate prefetch.
   * @param {'mail'|'sms'|'push'|'inApp'|string} workerType
   * @returns {Promise<import('amqplib').Channel>}
   * @throws {ConnectionError}
   */
  static async getChannel(workerType = 'default') {
    if (!isConnected) await RabbitMQClient.connect();

    const existing = channels.get(workerType);
    if (existing && !existing.closed) return existing.ch;
    if (existing) channels.delete(workerType);

    let ch;
    try {
      ch = await connection.createChannel();
    } catch (err) {
      throw new ConnectionError('rabbitmq', `Failed to create channel (${workerType}): ${err.message}`, { cause: err });
    }

    const state = { ch, closed: false };
    const { performance } = rabbitConfig;

    switch (workerType) {
      case 'mail':  await ch.prefetch(performance.mailWorkerPrefetch);  break;
      case 'sms':   await ch.prefetch(performance.smsWorkerPrefetch);   break;
      case 'push':  await ch.prefetch(performance.pushWorkerPrefetch);  break;
      case 'inApp': await ch.prefetch(performance.inAppWorkerPrefetch); break;
      default:      await ch.prefetch(1);
    }

    ch.on('error', (err) => {
      console.error(`[RabbitMQ] Channel error (${workerType}):`, err.message);
      state.closed = true;
      channels.delete(workerType);
    });
    ch.on('close', () => {
      console.warn(`[RabbitMQ] Channel closed (${workerType})`);
      state.closed = true;
      channels.delete(workerType);
    });

    channels.set(workerType, state);
    return ch;
  }

  /**
   * Get or create the persistent publisher channel.
   * @returns {Promise<import('amqplib').Channel>}
   * @throws {ConnectionError}
   */
  static async getPublisherChannel() {
    if (publisherChannel && !publisherClosed) return publisherChannel;
    if (!isConnected) await RabbitMQClient.connect();

    try {
      publisherChannel = await connection.createChannel();
    } catch (err) {
      throw new ConnectionError('rabbitmq', `Failed to create publisher channel: ${err.message}`, { cause: err });
    }

    publisherClosed = false;

    publisherChannel.on('error', (err) => {
      console.error('[RabbitMQ] Publisher channel error:', err.message);
      publisherClosed  = true;
      publisherChannel = null;
    });
    publisherChannel.on('close', () => {
      console.warn('[RabbitMQ] Publisher channel closed');
      publisherClosed  = true;
      publisherChannel = null;
    });
    publisherChannel.on('drain', () => {
      console.info('[RabbitMQ] Publisher back-pressure cleared');
    });

    return publisherChannel;
  }

  /**
   * Assert all exchanges (including DLX), main queues, and DLQ queues.
   * Call once after connect() during bootstrap.
   * @throws {InitializationError}
   */
  static async setupInfrastructure() {
    if (!isConnected) await RabbitMQClient.connect();

    const setupCh = await connection.createChannel();
    try {
      const { exchanges, queues, queueOptions, exchangeOptions, routingKeys } = rabbitConfig;

      for (const exchangeName of Object.values(exchanges)) {
        await setupCh.assertExchange(exchangeName, 'topic', exchangeOptions);
      }

      const queueBindings = [
        { key: 'notificationMail',  exchange: exchanges.emails, routingKey: routingKeys.notificationMail,  dlqKey: routingKeys.dlqMail  },
        { key: 'notificationSms',   exchange: exchanges.sms,    routingKey: routingKeys.notificationSms,   dlqKey: routingKeys.dlqSms   },
        { key: 'notificationPush',  exchange: exchanges.push,   routingKey: routingKeys.notificationPush,  dlqKey: routingKeys.dlqPush  },
        { key: 'notificationInApp', exchange: exchanges.inApp,  routingKey: routingKeys.notificationInApp, dlqKey: routingKeys.dlqInApp },
      ];

      for (const { key, exchange, routingKey, dlqKey } of queueBindings) {
        const opts = {
          ...queueOptions,
          arguments: {
            ...queueOptions.arguments,
            'x-dead-letter-exchange':    exchanges.dlx,
            'x-dead-letter-routing-key': dlqKey,
          },
        };
        await setupCh.assertQueue(queues[key], opts);
        await setupCh.bindQueue(queues[key], exchange, routingKey);
      }

      const dlqOptions = { durable: true, autoDelete: false };
      for (const { key, routingKey } of [
        { key: 'dlqMail',  routingKey: routingKeys.dlqMail  },
        { key: 'dlqSms',   routingKey: routingKeys.dlqSms   },
        { key: 'dlqPush',  routingKey: routingKeys.dlqPush  },
        { key: 'dlqInApp', routingKey: routingKeys.dlqInApp },
      ]) {
        await setupCh.assertQueue(queues[key], dlqOptions);
        await setupCh.bindQueue(queues[key], exchanges.dlx, routingKey);
      }

      console.info('[RabbitMQ] Infrastructure ready');
    } catch (err) {
      throw new InitializationError('rabbitmq', `Infrastructure setup failed: ${err.message}`, { cause: err });
    } finally {
      await setupCh.close().catch((e) => console.warn('[RabbitMQ] Setup channel close error:', e.message));
    }
  }

  /**
   * Publish a message to a topic exchange.
   * @param {string} exchange
   * @param {string} routingKey
   * @param {object} message
   * @param {object} [options]
   */
  static async publish(exchange, routingKey, message, options = {}) {
    const ch     = await RabbitMQClient.getPublisherChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    const result = ch.publish(exchange, routingKey, buffer, {
      ...rabbitConfig.messageOptions,
      timestamp: Math.floor(Date.now() / 1000),
      ...options,
    });
    if (!result) {
      console.warn(`[RabbitMQ] Back-pressure on "${exchange}" — slow down publish rate`);
    }
    return result;
  }

  /**
   * Register a consumer for a queue.
   * Acks on success, nacks to DLQ on handler error.
   *
   * @param {string}   queueName
   * @param {string}   workerType
   * @param {Function} handler   - async (message, rawMsg) => void
   */
  static async consume(queueName, workerType, handler) {
    const ch = await RabbitMQClient.getChannel(workerType);

    ch.consume(queueName, async (msg) => {
      if (!msg) return;

      let content;
      try {
        content = JSON.parse(msg.content.toString());
      } catch (parseErr) {
        console.error(`[RabbitMQ] Malformed JSON on "${queueName}":`, parseErr.message);
        ch.nack(msg, false, false);
        return;
      }

      try {
        await handler(content, msg);
        ch.ack(msg);
      } catch (err) {
        console.error(`[RabbitMQ] Handler error on "${queueName}":`, err.message);
        ch.nack(msg, false, false);
      }
    });

    console.info(`[RabbitMQ] Consumer registered: ${queueName} (${workerType})`);
  }

  /**
   * Send a message directly to a named queue.
   * @param {string} queueName
   * @param {object} message
   * @param {object} [options]
   */
  static async sendToQueue(queueName, message, options = {}) {
    const ch     = await RabbitMQClient.getPublisherChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    return ch.sendToQueue(queueName, buffer, {
      ...rabbitConfig.messageOptions,
      timestamp: Math.floor(Date.now() / 1000),
      ...options,
    });
  }

  /** @returns {{ status: string, service: string, activeChannels?: number }} */
  static healthCheck() {
    if (!isConnected || !connection) {
      return { status: 'unhealthy', service: 'rabbitmq', error: 'Not connected' };
    }
    return { status: 'healthy', service: 'rabbitmq', activeChannels: channels.size, reconnectAttempts };
  }

  /** Gracefully close all channels and the connection. */
  static async disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    for (const [type, state] of channels.entries()) {
      if (state && !state.closed) {
        await state.ch.close().catch((e) => console.warn(`[RabbitMQ] Channel (${type}) close error:`, e.message));
      }
    }
    channels.clear();

    if (publisherChannel && !publisherClosed) {
      await publisherChannel.close().catch((e) => console.warn('[RabbitMQ] Publisher close error:', e.message));
    }
    publisherChannel = null;
    publisherClosed  = false;

    if (connection && isConnected) {
      await connection.close().catch((e) => console.warn('[RabbitMQ] Connection close error:', e.message));
    }
    connection        = null;
    isConnected       = false;
    reconnectAttempts = 0;
    console.info('[RabbitMQ] Disconnected');
  }
}

module.exports = RabbitMQClient;
