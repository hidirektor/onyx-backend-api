'use strict';

const logger = require('@shared/utils/logger');

/**
 * PushProvider - Sends push notifications to mobile devices.
 *
 * TODO: Integrate firebase-admin (FCM) or node-apn (APNs) for production use.
 *
 * Expected payload:
 *   { deviceToken: string, title: string, body: string, data?: object }
 */
class PushProvider {
  /**
   * @param {{ deviceToken: string, title: string, body: string, data?: object }} payload
   */
  async send({ deviceToken, title, body, data = {} }) {
    if (!deviceToken) throw new Error('[PushProvider] deviceToken is required');
    if (!title) throw new Error('[PushProvider] title is required');

    // TODO: Replace with actual FCM/APNs integration:
    // const admin = require('firebase-admin');
    // await admin.messaging().send({ token: deviceToken, notification: { title, body }, data });

    logger.info('[PushProvider] Push notification sent (stub)', {
      deviceToken: `${deviceToken.slice(0, 8)}...`,
      title,
    });

    return { provider: 'push', status: 'sent', deviceToken, title };
  }
}

module.exports = PushProvider;
