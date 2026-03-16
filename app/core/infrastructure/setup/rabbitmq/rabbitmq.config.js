'use strict';

const protocol  = process.env.RABBITMQ_USE_SSL === 'true' ? 'amqps' : 'amqp';
const host      = process.env.RABBITMQ_HOST     || 'localhost';
const port      = process.env.RABBITMQ_PORT     || 5672;
const user      = encodeURIComponent(process.env.RABBITMQ_USERNAME || 'guest');
const pass      = encodeURIComponent(process.env.RABBITMQ_PASSWORD || 'guest');
const vhost     = process.env.RABBITMQ_VHOST    || '/';
const vhostPath = vhost === '/' ? '' : `/${encodeURIComponent(vhost)}`;

module.exports = {
  url: `${protocol}://${user}:${pass}@${host}:${port}${vhostPath}`,

  connection: {
    heartbeat:         parseInt(process.env.RABBITMQ_HEARTBEAT, 10)          || 60,
    connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT, 10) || 30000,
  },

  exchanges: {
    notifications: 'onyx.notifications',
    emails:        'onyx.emails',
    sms:           'onyx.sms',
    push:          'onyx.push',
    inApp:         'onyx.in_app',
    dlx:           'onyx.dlx', // dead-letter exchange
  },

  queues: {
    notificationMail:  'notification.mail',
    notificationSms:   'notification.sms',
    notificationPush:  'notification.push',
    notificationInApp: 'notification.in_app',
    // Dead letter queues
    dlqMail:           'dlq.mail',
    dlqSms:            'dlq.sms',
    dlqPush:           'dlq.push',
    dlqInApp:          'dlq.in_app',
  },

  routingKeys: {
    notificationMail:  'notification.mail',
    notificationSms:   'notification.sms',
    notificationPush:  'notification.push',
    notificationInApp: 'notification.in_app',
    // DLQ routing keys (used when dead-lettering from main queues → onyx.dlx)
    dlqMail:           'dlq.mail',
    dlqSms:            'dlq.sms',
    dlqPush:           'dlq.push',
    dlqInApp:          'dlq.in_app',
  },

  // Base queue options — DLX arguments are set per-queue in setupInfrastructure
  queueOptions: {
    durable:    true,
    autoDelete: false,
    arguments: {
      'x-message-ttl': 3600000, // 1 hour
    },
  },

  exchangeOptions: {
    durable:    true,
    autoDelete: false,
  },

  messageOptions: {
    persistent:   true,
    deliveryMode: 2,
    contentType:  'application/json',
  },

  performance: {
    mailWorkerPrefetch:  1,
    smsWorkerPrefetch:   5,
    pushWorkerPrefetch:  10,
    inAppWorkerPrefetch: 10,
  },
};
