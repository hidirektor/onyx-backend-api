'use strict';

const { StatusCodes } = require('http-status-codes');

/**
 * BasePolicy - Authorization layer.
 * Subclasses add named policy methods (user, req) => boolean.
 *
 * Usage:
 *   router.get('/me', authMiddleware, policy.can('viewOwnProfile'), controller);
 */
class BasePolicy {
  /**
   * Returns Express middleware that runs the named policy check.
   * @param {string} action - Method name on the concrete policy class
   */
  can(action) {
    return async (req, res, next) => {
      try {
        if (typeof this[action] !== 'function') {
          throw new Error(`Policy action "${action}" is not defined on ${this.constructor.name}`);
        }
        const allowed = await this[action](req.user, req);
        if (!allowed) {
          return res.status(StatusCodes.FORBIDDEN).json({
            request: {
              requestCode:   String(StatusCodes.FORBIDDEN),
              resultMessage: 'Forbidden: insufficient permissions',
              requestResult: false,
            },
            payload: null,
          });
        }
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }
}

module.exports = BasePolicy;
