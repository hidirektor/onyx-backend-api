'use strict';

const BaseRateLimiter = require('@core/base/rate-limiter/BaseRateLimiter');

/**
 * AuthRateLimiter - Stricter rate limits for authentication endpoints.
 * 10 requests / 10 minutes per IP.
 */
class AuthRateLimiter extends BaseRateLimiter {
  getOptions() {
    return {
      ...super.getOptions(),
      windowMs: 10 * 60 * 1000,
      max: 10,
      skipSuccessfulRequests: false,
      message: {
        request: {
          requestCode:   '429',
          resultMessage: 'Too many authentication attempts. Please wait 10 minutes and try again.',
          requestResult: false,
        },
        payload: null,
      },
    };
  }
}

module.exports = AuthRateLimiter;
