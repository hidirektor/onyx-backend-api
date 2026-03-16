'use strict';

module.exports = {
  url: process.env.RABBITMQ_URL,
  exchanges: {
    notifications: 'notifications',
  },
  queues: {
    notificationPush: 'notification_push_queue',
    notificationInApp: 'notification_inapp_queue',
    notificationMail: 'notification_mail_queue',
    notificationSms: 'notification_sms_queue',
  },
};
