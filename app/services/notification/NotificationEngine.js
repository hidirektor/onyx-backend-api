'use strict';

const RabbitMQClient = require('@core/infrastructure/setup/rabbitmq/rabbitmq.client');
const rabbitConfig   = require('@infrastructure/setup/rabbitmq/rabbitmq.config');
const PushProvider = require('./providers/PushProvider');
const InAppProvider = require('./providers/InAppProvider');
const MailProvider = require('./providers/MailProvider');
const SmsProvider = require('./providers/SmsProvider');
const logger = require('@shared/utils/logger');

/**
 * Notification channel identifiers.
 * @readonly
 */
const CHANNELS = Object.freeze({
  PUSH: 'push',
  IN_APP: 'inapp',
  MAIL: 'mail',
  SMS: 'sms',
});

/**
 * NotificationEngine - Centralized notification dispatcher.
 *
 * Implements the Strategy pattern: each channel has a dedicated provider.
 * Supports both synchronous (direct) and asynchronous (queue-based) dispatch.
 *
 * Direct dispatch (in-process):
 *   await NotificationEngine.send('mail', { to, subject, html });
 *
 * Queue-based dispatch (async via RabbitMQ):
 *   await NotificationEngine.queue('push', { deviceToken, title, body });
 *
 * Start queue consumers at bootstrap:
 *   await NotificationEngine.startConsumer();
 */
class NotificationEngine {
  constructor() {
    this._providers = {
      [CHANNELS.PUSH]: new PushProvider(),
      [CHANNELS.IN_APP]: new InAppProvider(),
      [CHANNELS.MAIL]: new MailProvider(),
      [CHANNELS.SMS]: new SmsProvider(),
    };
  }

  /**
   * Dispatch a notification synchronously (in-process).
   * Use this when you need guaranteed delivery before the current request completes.
   *
   * @param {'push'|'inapp'|'mail'|'sms'} channel
   * @param {object} payload - Channel-specific payload (see each provider for schema)
   * @returns {Promise<object>} Delivery result from the provider
   */
  async send(channel, payload) {
    const provider = this._providers[channel];
    if (!provider) {
      throw new Error(`[NotificationEngine] Unknown channel: "${channel}". Valid channels: ${Object.values(CHANNELS).join(', ')}`);
    }

    logger.info(`[NotificationEngine] Dispatching ${channel} notification`);
    return provider.send(payload);
  }

  /**
   * Dispatch a notification asynchronously via RabbitMQ.
   * Returns immediately after enqueuing. Consumer processes in background.
   *
   * @param {'push'|'inapp'|'mail'|'sms'} channel
   * @param {object} payload
   */
  async queue(channel, payload) {
    if (!this._providers[channel]) {
      throw new Error(`[NotificationEngine] Unknown channel: "${channel}"`);
    }

    const exchangeMap = {
      [CHANNELS.MAIL]:   rabbitConfig.exchanges.emails,
      [CHANNELS.SMS]:    rabbitConfig.exchanges.sms,
      [CHANNELS.PUSH]:   rabbitConfig.exchanges.push,
      [CHANNELS.IN_APP]: rabbitConfig.exchanges.inApp,
    };
    const routingKeyMap = {
      [CHANNELS.MAIL]:   rabbitConfig.routingKeys.notificationMail,
      [CHANNELS.SMS]:    rabbitConfig.routingKeys.notificationSms,
      [CHANNELS.PUSH]:   rabbitConfig.routingKeys.notificationPush,
      [CHANNELS.IN_APP]: rabbitConfig.routingKeys.notificationInApp,
    };

    await RabbitMQClient.publish(exchangeMap[channel], routingKeyMap[channel], {
      channel,
      payload,
      enqueuedAt: new Date().toISOString(),
    });

    logger.info(`[NotificationEngine] Queued ${channel} notification`);
  }

  /**
   * Send notifications to multiple channels at once.
   * Failures on individual channels are logged but do not abort others.
   *
   * @param {Array<{ channel: string, payload: object }>} notifications
   * @returns {Promise<object[]>} Array of results/errors per notification
   */
  async sendMultiple(notifications) {
    return Promise.allSettled(
      notifications.map(({ channel, payload }) => this.send(channel, payload))
    );
  }

  /**
   * Start RabbitMQ consumers for all notification channels.
   * Call once at application bootstrap.
   */
  async startConsumer() {
    const consumerMap = [
      { channel: CHANNELS.MAIL,   queueName: rabbitConfig.queues.notificationMail,  workerType: 'mail'  },
      { channel: CHANNELS.SMS,    queueName: rabbitConfig.queues.notificationSms,   workerType: 'sms'   },
      { channel: CHANNELS.PUSH,   queueName: rabbitConfig.queues.notificationPush,  workerType: 'push'  },
      { channel: CHANNELS.IN_APP, queueName: rabbitConfig.queues.notificationInApp, workerType: 'inApp' },
    ];

    for (const { channel, queueName, workerType } of consumerMap) {
      await RabbitMQClient.consume(
        queueName,
        workerType,
        async ({ payload }) => this.send(channel, payload)
      );
      logger.info(`[NotificationEngine] Consumer registered: ${queueName} (worker: ${workerType})`);
    }
  }
}

// Export as singleton
module.exports = new NotificationEngine();
module.exports.CHANNELS = CHANNELS;
