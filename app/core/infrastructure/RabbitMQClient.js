'use strict';

const amqp = require('amqplib');
const rabbitConfig = require('@infrastructure/setup/configs/rabbitmq.config');

let connection = null;
let channel = null;
let reconnectTimer = null;

/**
 * RabbitMQClient - Singleton AMQP connection and channel manager.
 *
 * Uses a topic exchange model for flexible routing.
 * Automatically attempts reconnection on unexpected disconnects.
 *
 * Usage:
 *   await RabbitMQClient.connect();
 *   await RabbitMQClient.publish('notifications', 'notification.mail', payload);
 *   await RabbitMQClient.consume('notifications', 'notification.mail', 'mail_queue', handler);
 */
class RabbitMQClient {
  /**
   * Establish connection and create a shared channel.
   * Safe to call multiple times - returns existing connection if healthy.
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async connect() {
    if (connection && channel) return channel;

    try {
      connection = await amqp.connect(rabbitConfig.url);
      channel = await connection.createChannel();

      console.info('[RabbitMQ] Connected');

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Attempting reconnect in 5s...');
        connection = null;
        channel = null;
        RabbitMQClient._scheduleReconnect();
      });

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
      });

      channel.on('error', (err) => {
        console.error('[RabbitMQ] Channel error:', err.message);
        channel = null;
      });

      return channel;
    } catch (err) {
      console.error('[RabbitMQ] Connection failed:', err.message);
      RabbitMQClient._scheduleReconnect();
      throw err;
    }
  }

  static _scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        await RabbitMQClient.connect();
      } catch {
        // Will retry again from close handler
      }
    }, 5000);
  }

  /**
   * Get the active channel, connecting if necessary.
   * @returns {Promise<import('amqplib').Channel>}
   */
  static async getChannel() {
    if (!channel) await RabbitMQClient.connect();
    return channel;
  }

  /**
   * Publish a message to a topic exchange.
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key (e.g. 'notification.mail')
   * @param {object} message - Will be JSON-serialized
   * @param {object} [options] - AMQP publish options
   */
  static async publish(exchange, routingKey, message, options = {}) {
    const ch = await RabbitMQClient.getChannel();
    await ch.assertExchange(exchange, 'topic', { durable: true });
    const buffer = Buffer.from(JSON.stringify(message));
    ch.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
      ...options,
    });
  }

  /**
   * Register a consumer for a topic exchange binding.
   * Messages are auto-acked on success, nacked (dead-lettered) on handler error.
   *
   * @param {string} exchange
   * @param {string} routingKey - Binding pattern (e.g. 'notification.*')
   * @param {string} queue - Queue name
   * @param {Function} handler - async (message, rawMsg) => void
   */
  static async consume(exchange, routingKey, queue, handler) {
    const ch = await RabbitMQClient.getChannel();
    await ch.assertExchange(exchange, 'topic', { durable: true });
    const q = await ch.assertQueue(queue, { durable: true });
    await ch.bindQueue(q.queue, exchange, routingKey);
    ch.prefetch(1); // Process one message at a time per consumer

    ch.consume(q.queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content, msg);
        ch.ack(msg);
      } catch (err) {
        console.error(`[RabbitMQ] Handler error on queue "${queue}":`, err.message);
        ch.nack(msg, false, false); // Send to dead-letter queue, do not requeue
      }
    });

    console.info(`[RabbitMQ] Consumer registered: ${queue} <- ${exchange}[${routingKey}]`);
  }

  /**
   * Gracefully close the connection.
   */
  static async disconnect() {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.info('[RabbitMQ] Disconnected');
  }
}

module.exports = RabbitMQClient;
