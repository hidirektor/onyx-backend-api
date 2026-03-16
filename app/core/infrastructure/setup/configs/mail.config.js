'use strict';

module.exports = {
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER || undefined,
    pass: process.env.MAIL_PASS || undefined,
  },
  from: process.env.MAIL_FROM,
  fromName: process.env.MAIL_FROM_NAME || process.env.MAIL_FROM,
};
