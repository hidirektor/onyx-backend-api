'use strict';

const amqp = require('amqplib');
const rabbitConfig = require('@infrastructure/setup/configs/rabbitmq.config');

let connection       = null;
let isConnected      = false;
const channels       = new Map(); // worker-type → channel
let publisherChannel = null;      // persistent publisher channel
let reconnectTimer   = null;

/**
 * RabbitMQClient - Singleton AMQP connection and multi-channel manager.
 *
 * - One channel per worker type (email, sms, push, inApp) with configurable prefetch.
 * - Separate persistent publisher channel for all outbound messages.
 * - Automatic reconnect on unexpected disconnects.
 * - Infrastructure setup: asserts all exchanges, queues, and dead-letter queues.
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

      isConnected = true;
      console.info('[RabbitMQ] Connected');

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Attempting reconnect in 5s...');
        isConnected = false;
        channels.clear();
        publisherChannel = null;
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
      console.error('[RabbitMQ] Connection failed:', err.message);
      RabbitMQClient._scheduleReconnect();
      throw err;
    }
  }

  static _scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try { await RabbitMQClient.connect(); } catch { /* next close will retry */ }
    }, 5000);
  }

  /**
   * Get or create a channel for a specific worker type with appropriate prefetch.
   * @param {'mail'|'sms'|'push'|'inApp'|string} workerType
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async getChannel(workerType = 'default') {
    if (!isConnected) await RabbitMQClient.connect();

    if (channels.has(workerType)) {
      const ch = channels.get(workerType);
      if (ch && !ch.closed) return ch;
      channels.delete(workerType);
    }

    const ch = await connection.createChannel();

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
      channels.delete(workerType);
    });
    ch.on('close', () => {
      console.warn(`[RabbitMQ] Channel closed (${workerType})`);
      channels.delete(workerType);
    });

    channels.set(workerType, ch);
    return ch;
  }

  /**
   * Get or create the persistent publisher channel (reused for all publish calls).
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async getPublisherChannel() {
    if (publisherChannel && !publisherChannel.closed) return publisherChannel;
    if (!isConnected) await RabbitMQClient.connect();

    publisherChannel = await connection.createChannel();
    publisherChannel.on('error', (err) => {
      console.error('[RabbitMQ] Publisher channel error:', err.message);
      publisherChannel = null;
    });
    publisherChannel.on('close', () => {
      console.warn('[RabbitMQ] Publisher channel closed');
      publisherChannel = null;
    });
    return publisherChannel;
  }

  /**
   * Assert all exchanges, queues, and dead-letter queues.
   * Call once after connect() during bootstrap.
   */
  static async setupInfrastructure() {
    if (!isConnected) await RabbitMQClient.connect();

    const setupCh = await connection.createChannel();
    try {
      const { exchanges, queues, queueOptions, exchangeOptions, routingKeys } = rabbitConfig;

      // Assert exchanges
      for (const exchangeName of Object.values(exchanges)) {
        await setupCh.assertExchange(exchangeName, 'topic', exchangeOptions);
      }

      // Assert main queues and bind to exchanges
      const queueBindings = {
        notificationMail:  { exchange: exchanges.emails,  routingKey: routingKeys.notificationMail },
        notificationSms:   { exchange: exchanges.sms,     routingKey: routingKeys.notificationSms },
        notificationPush:  { exchange: exchanges.push,    routingKey: routingKeys.notificationPush },
        notificationInApp: { exchange: exchanges.inApp,   routingKey: routingKeys.notificationInApp },
      };

      for (const [key, { exchange, routingKey }] of Object.entries(queueBindings)) {
        const queueName = queues[key];
        await setupCh.assertQueue(queueName, queueOptions);
        await setupCh.bindQueue(queueName, exchange, routingKey);
      }

      // Assert dead-letter queues (durable, no TTL or DLX)
      const dlqOptions = { durable: true, autoDelete: false };
      for (const [key, queueName] of Object.entries(queues)) {
        if (key.startsWith('dlq')) {
          await setupCh.assertQueue(queueName, dlqOptions);
        }
      }

      console.info('[RabbitMQ] Infrastructure ready');
    } finally {
      await setupCh.close().catch(() => {});
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
    const ch = await RabbitMQClient.getPublisherChannel();
    await ch.assertExchange(exchange, 'topic', rabbitConfig.exchangeOptions);
    const buffer = Buffer.from(JSON.stringify(message));
    const result = ch.publish(exchange, routingKey, buffer, {
      ...rabbitConfig.messageOptions,
      timestamp: Math.floor(Date.now() / 1000),
      ...options,
    });
    if (!result) console.warn(`[RabbitMQ] Back-pressure on exchange "${exchange}"`);
    return result;
  }

  /**
   * Register a consumer for a queue bound to a topic exchange.
   * Messages are auto-acked on success, nacked (no requeue) on handler error.
   *
   * @param {string}   queueName  - Queue name
   * @param {string}   workerType - Worker type for channel/prefetch selection
   * @param {Function} handler    - async (message, rawMsg) => void
   */
  static async consume(queueName, workerType, handler) {
    const ch = await RabbitMQClient.getChannel(workerType);

    ch.consume(queueName, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
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
    const ch = await RabbitMQClient.getPublisherChannel();
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
    return { status: 'healthy', service: 'rabbitmq', activeChannels: channels.size };
  }

  /**
   * Gracefully close all channels and the connection.
   */
  static async disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    for (const [type, ch] of channels.entries()) {
      try { if (ch && !ch.closed) await ch.close(); } catch (err) {
        console.error(`[RabbitMQ] Error closing channel (${type}):`, err.message);
      }
    }
    channels.clear();

    if (publisherChannel && !publisherChannel.closed) {
      try { await publisherChannel.close(); } catch (err) {
        console.error('[RabbitMQ] Error closing publisher channel:', err.message);
      }
    }
    publisherChannel = null;

    if (connection && isConnected) {
      try { await connection.close(); } catch (err) {
        console.error('[RabbitMQ] Error closing connection:', err.message);
      }
    }
    connection = null;
    isConnected = false;
    console.info('[RabbitMQ] Disconnected');
  }
}

module.exports = RabbitMQClient;
