'use strict';

const logger = require('@shared/utils/logger');

/**
 * SmsProvider - Sends SMS notifications.
 *
 * TODO: Integrate Twilio, Vonage, or Netgsm for production use.
 *
 * Expected payload:
 *   { to: string, message: string }
 */
class SmsProvider {
  /**
   * @param {{ to: string, message: string }} payload
   */
  async send({ to, message }) {
    if (!to) throw new Error('[SmsProvider] "to" phone number is required');
    if (!message) throw new Error('[SmsProvider] "message" is required');

    // TODO: Replace with actual SMS provider integration:
    // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await twilio.messages.create({ from: process.env.TWILIO_FROM, to, body: message });

    logger.info('[SmsProvider] SMS sent (stub)', {
      to: `${to.slice(0, 4)}****${to.slice(-2)}`,
      messageLength: message.length,
    });

    return { provider: 'sms', status: 'sent', to, message };
  }
}

module.exports = SmsProvider;
