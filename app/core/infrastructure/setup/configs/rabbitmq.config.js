'use strict';

const protocol = process.env.RABBITMQ_USE_SSL === 'true' ? 'amqps' : 'amqp';
const host     = process.env.RABBITMQ_HOST;
const port     = process.env.RABBITMQ_PORT;
const user     = encodeURIComponent(process.env.RABBITMQ_USERNAME || '');
const pass     = encodeURIComponent(process.env.RABBITMQ_PASSWORD || '');
const vhost    = encodeURIComponent(process.env.RABBITMQ_VHOST || '/');

module.exports = {
  url: `${protocol}://${user}:${pass}@${host}:${port}/${vhost}`,
  exchanges: {
    notifications: 'notifications',
  },
  queues: {
    notificationPush:  'notification_push_queue',
    notificationInApp: 'notification_inapp_queue',
    notificationMail:  'notification_mail_queue',
    notificationSms:   'notification_sms_queue',
  },
};
