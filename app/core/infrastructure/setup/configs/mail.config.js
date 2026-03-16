'use strict';

module.exports = {
  host:     process.env.RESEND_SMTP_HOST,
  port:     parseInt(process.env.RESEND_SMTP_PORT, 10),
  secure:   process.env.RESEND_SMTP_PORT === '465',
  auth: {
    user: process.env.RESEND_SMTP_USER || undefined,
    pass: process.env.RESEND_SMTP_PASS || undefined,
  },
  from:     process.env.RESEND_SMTP_FROM,
  fromName: process.env.RESEND_SMTP_FROM_NAME || process.env.RESEND_SMTP_FROM,
};
