'use strict';

const logger = require('@shared/utils/logger');

/**
 * HTTP request/response logger middleware.
 * Logs method, URL, status code, and response time on request completion.
 */
module.exports = (req, res, next) => {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    try {
      const durationNs = process.hrtime.bigint() - startAt;
      const durationMs = Number(durationNs / BigInt(1_000_000));

      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`, {
        method:    req.method,
        url:       req.originalUrl,
        status:    res.statusCode,
        duration:  `${durationMs}ms`,
        ip:        req.ip || req.socket?.remoteAddress,
        userAgent: req.get('user-agent'),
        userId:    req.user?.id || null,
      });
    } catch {
      // Never crash the process from a logging error
    }
  });

  next();
};
