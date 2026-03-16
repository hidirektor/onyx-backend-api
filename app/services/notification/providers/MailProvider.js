'use strict';

const nodemailer = require('nodemailer');
const mailConfig = require('@infrastructure/setup/configs/mail.config');
const logger = require('@shared/utils/logger');

/**
 * MailProvider - Sends transactional emails via SMTP using Nodemailer.
 *
 * Supports HTML and plain-text emails.
 * Configure SMTP settings via environment variables (see mail.config.js).
 *
 * Expected payload:
 *   { to: string|string[], subject: string, html?: string, text?: string, attachments?: object[] }
 */
class MailProvider {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.auth,
    });
  }

  /**
   * @param {{ to: string|string[], subject: string, html?: string, text?: string, attachments?: object[] }} payload
   * @returns {Promise<import('nodemailer').SentMessageInfo>}
   */
  async send({ to, subject, html, text, attachments = [] }) {
    if (!to) throw new Error('[MailProvider] "to" is required');
    if (!subject) throw new Error('[MailProvider] "subject" is required');
    if (!html && !text) throw new Error('[MailProvider] Either "html" or "text" is required');

    const mailOptions = {
      from: `"${mailConfig.fromName}" <${mailConfig.from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      attachments,
    };

    const info = await this.transporter.sendMail(mailOptions);
    logger.info('[MailProvider] Email sent', { messageId: info.messageId, to, subject });
    return { provider: 'mail', status: 'sent', messageId: info.messageId, to, subject };
  }

  /**
   * Verify SMTP connection. Useful for health checks.
   * @returns {Promise<boolean>}
   */
  async verify() {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = MailProvider;
