'use strict';

const rateLimit = require('express-rate-limit');

/**
 * BaseRateLimiter - Configurable rate limiter wrapper.
 * Override getOptions() in subclasses for module-specific limits.
 */
class BaseRateLimiter {
  /** @returns {import('express-rate-limit').Options} */
  getOptions() {
    return {
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        request: {
          requestCode:   '429',
          resultMessage: 'Too many requests, please try again later.',
          requestResult: false,
        },
        payload: null,
      },
    };
  }

  /** @returns {import('express').RequestHandler} */
  middleware() {
    return rateLimit(this.getOptions());
  }
}

module.exports = BaseRateLimiter;
