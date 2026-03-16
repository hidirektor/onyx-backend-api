'use strict';

const { StatusCodes } = require('http-status-codes');

/**
 * BaseController — Shared response helpers and async error boundary.
 *
 * All responses follow the fixed envelope:
 * { request: { requestCode, resultMessage, requestResult }, payload: ... }
 */
class BaseController {
  /**
   * Send a success response.
   * @param {import('express').Response} res
   * @param {*}      payload
   * @param {string} message
   * @param {number} statusCode
   */
  success(res, payload = null, message = 'Success', statusCode = StatusCodes.OK) {
    return res.status(statusCode).json({
      request: {
        requestCode:   String(statusCode),
        resultMessage: message,
        requestResult: true,
      },
      payload,
    });
  }

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {string}        message
   * @param {number}        statusCode
   * @param {string[]|null} errors     - Validation error details
   */
  error(res, message = 'Error', statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) {
    return res.status(statusCode).json({
      request: {
        requestCode:   String(statusCode),
        resultMessage: message,
        requestResult: false,
      },
      payload: errors ? { errors } : null,
    });
  }

  /**
   * Send a paginated success response wrapping Sequelize findAndCountAll results.
   * @param {import('express').Response} res
   * @param {{ rows: any[], count: number }} result
   * @param {number} page
   * @param {number} limit
   */
  paginate(res, { rows, count }, page, limit) {
    const parsedPage  = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    return res.status(StatusCodes.OK).json({
      request: {
        requestCode:   String(StatusCodes.OK),
        resultMessage: 'Success',
        requestResult: true,
      },
      payload: {
        data: rows,
        meta: {
          total:      count,
          page:       parsedPage,
          limit:      parsedLimit,
          totalPages: Math.ceil(count / parsedLimit),
        },
      },
    });
  }

  /**
   * Wraps async route handlers — forwards errors to Express error middleware.
   * @param {Function} fn
   */
  asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  }
}

module.exports = BaseController;
