'use strict';

const amqp        = require('amqplib');
const rabbitConfig = require('./rabbitmq.config');

let connection        = null;
let isConnected       = false;
const channels        = new Map(); // workerType → { ch, closed }
let publisherChannel  = null;
let publisherClosed   = false;
let reconnectTimer    = null;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * RabbitMQClient - Singleton AMQP connection and multi-channel manager.
 *
 * - One channel per worker type (email, sms, push, inApp) with configurable prefetch.
 * - Separate persistent publisher channel for all outbound messages.
 * - Automatic reconnect on unexpected disconnects (up to MAX_RECONNECT_ATTEMPTS).
 * - Infrastructure setup: asserts all exchanges, queues, DLX, and dead-letter queues.
 *
 * Usage:
 *   await RabbitMQClient.connect();
 *   await RabbitMQClient.setupInfrastructure();
 *   await RabbitMQClient.publish('onyx.emails', 'notification.mail', payload);
 *   await RabbitMQClient.consume('notification.mail', 'mail', handler);
 */
class RabbitMQClient {
  /**
   * Establish connection. Safe to call multiple times.
   * @returns {Promise<import('amqplib').Connection>}
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
        console.warn('[RabbitMQ] Connection closed. Scheduling reconnect...');
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
      console.error('[RabbitMQ] Connection failed:', err.message);
      RabbitMQClient._scheduleReconnect();
      throw err;
    }
  }

  static _scheduleReconnect() {
    if (reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[RabbitMQ] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(reconnectAttempts * 1000, 30000);
    console.warn(`[RabbitMQ] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try { await RabbitMQClient.connect(); } catch { /* next close will retry */ }
    }, delay);
  }

  /**
   * Get or create a channel for a specific worker type with appropriate prefetch.
   * @param {'mail'|'sms'|'push'|'inApp'|string} workerType
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async getChannel(workerType = 'default') {
    if (!isConnected) await RabbitMQClient.connect();

    const existing = channels.get(workerType);
    if (existing && !existing.closed) return existing.ch;
    if (existing) channels.delete(workerType);

    const ch    = await connection.createChannel();
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
   * Get or create the persistent publisher channel (reused for all publish calls).
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async getPublisherChannel() {
    if (publisherChannel && !publisherClosed) return publisherChannel;
    if (!isConnected) await RabbitMQClient.connect();

    publisherChannel = await connection.createChannel();
    publisherClosed  = false;

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
      console.info('[RabbitMQ] Publisher channel drain: back-pressure cleared');
    });

    return publisherChannel;
  }

  /**
   * Assert all exchanges (including DLX), queues with correct DLX routing, and DLQ queues.
   * Call once after connect() during bootstrap.
   */
  static async setupInfrastructure() {
    if (!isConnected) await RabbitMQClient.connect();

    const setupCh = await connection.createChannel();
    try {
      const { exchanges, queues, queueOptions, exchangeOptions, routingKeys } = rabbitConfig;

      // Assert all exchanges (including dead-letter exchange)
      for (const exchangeName of Object.values(exchanges)) {
        await setupCh.assertExchange(exchangeName, 'topic', exchangeOptions);
      }

      // Per-queue setup: main queues with per-queue DLX routing
      const queueBindings = [
        {
          key:        'notificationMail',
          exchange:   exchanges.emails,
          routingKey: routingKeys.notificationMail,
          dlqKey:     routingKeys.dlqMail,
        },
        {
          key:        'notificationSms',
          exchange:   exchanges.sms,
          routingKey: routingKeys.notificationSms,
          dlqKey:     routingKeys.dlqSms,
        },
        {
          key:        'notificationPush',
          exchange:   exchanges.push,
          routingKey: routingKeys.notificationPush,
          dlqKey:     routingKeys.dlqPush,
        },
        {
          key:        'notificationInApp',
          exchange:   exchanges.inApp,
          routingKey: routingKeys.notificationInApp,
          dlqKey:     routingKeys.dlqInApp,
        },
      ];

      for (const { key, exchange, routingKey, dlqKey } of queueBindings) {
        const queueName = queues[key];
        const opts = {
          ...queueOptions,
          arguments: {
            ...queueOptions.arguments,
            'x-dead-letter-exchange':    exchanges.dlx,
            'x-dead-letter-routing-key': dlqKey,
          },
        };
        await setupCh.assertQueue(queueName, opts);
        await setupCh.bindQueue(queueName, exchange, routingKey);
      }

      // Assert dead-letter queues and bind them to the DLX exchange
      const dlqBindings = [
        { key: 'dlqMail',  routingKey: routingKeys.dlqMail },
        { key: 'dlqSms',   routingKey: routingKeys.dlqSms },
        { key: 'dlqPush',  routingKey: routingKeys.dlqPush },
        { key: 'dlqInApp', routingKey: routingKeys.dlqInApp },
      ];
      const dlqOptions = { durable: true, autoDelete: false };
      for (const { key, routingKey } of dlqBindings) {
        const queueName = queues[key];
        await setupCh.assertQueue(queueName, dlqOptions);
        await setupCh.bindQueue(queueName, exchanges.dlx, routingKey);
      }

      console.info('[RabbitMQ] Infrastructure ready');
    } finally {
      await setupCh.close().catch((err) => {
        console.warn('[RabbitMQ] Setup channel close error:', err.message);
      });
    }
  }

  /**
   * Publish a message to a topic exchange.
   * @param {string} exchange   - Exchange name
   * @param {string} routingKey - Routing key
   * @param {object} message    - Will be JSON-serialized
   * @param {object} [options]  - Additional AMQP publish options
   */
  static async publish(exchange, routingKey, message, options = {}) {
    const ch     = await RabbitMQClient.getPublisherChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    const result = ch.publish(exchange, routingKey, buffer, {
      ...rabbitConfig.messageOptions,
      timestamp: Math.floor(Date.now() / 1000),
      ...options,
    });
    if (!result) console.warn(`[RabbitMQ] Back-pressure on exchange "${exchange}" — consider slowing publish rate`);
    return result;
  }

  /**
   * Register a consumer for a queue.
   * Messages are acked on success, nacked (no requeue → DLQ) on handler error.
   *
   * @param {string}   queueName  - Queue name
   * @param {string}   workerType - Worker type for channel/prefetch selection
   * @param {Function} handler    - async (message, rawMsg) => void
   */
  static async consume(queueName, workerType, handler) {
    const ch = await RabbitMQClient.getChannel(workerType);

    ch.consume(queueName, async (msg) => {
      if (!msg) return; // consumer cancelled

      let content;
      try {
        content = JSON.parse(msg.content.toString());
      } catch (parseErr) {
        console.error(`[RabbitMQ] Malformed JSON on queue "${queueName}":`, parseErr.message);
        ch.nack(msg, false, false);
        return;
      }

      try {
        await handler(content, msg);
        ch.ack(msg);
      } catch (err) {
        console.error(`[RabbitMQ] Handler error on queue "${queueName}":`, err.message);
        ch.nack(msg, false, false); // dead-letter, no requeue
      }
    });

    console.info(`[RabbitMQ] Consumer registered: ${queueName} (worker: ${workerType})`);
  }

  /**
   * Send a message directly to a named queue (bypasses exchange routing).
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

  /**
   * Health check.
   * @returns {{ status: string, service: string, activeChannels?: number, error?: string }}
   */
  static healthCheck() {
    if (!isConnected || !connection) {
      return { status: 'unhealthy', service: 'rabbitmq', error: 'Not connected' };
    }
    return {
      status:           'healthy',
      service:          'rabbitmq',
      activeChannels:   channels.size,
      reconnectAttempts,
    };
  }

  /**
   * Gracefully close all channels and the connection.
   */
  static async disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    for (const [type, state] of channels.entries()) {
      if (state && !state.closed) {
        try { await state.ch.close(); } catch (err) {
          console.warn(`[RabbitMQ] Error closing channel (${type}):`, err.message);
        }
      }
    }
    channels.clear();

    if (publisherChannel && !publisherClosed) {
      try { await publisherChannel.close(); } catch (err) {
        console.warn('[RabbitMQ] Error closing publisher channel:', err.message);
      }
    }
    publisherChannel = null;
    publisherClosed  = false;

    if (connection && isConnected) {
      try { await connection.close(); } catch (err) {
        console.warn('[RabbitMQ] Error closing connection:', err.message);
      }
    }
    connection        = null;
    isConnected       = false;
    reconnectAttempts = 0;
    console.info('[RabbitMQ] Disconnected');
  }
}

module.exports = RabbitMQClient;
