'use strict';

const { StatusCodes } = require('http-status-codes');

/**
 * BaseResponse — Standardized API response envelope.
 *
 * Every response follows this fixed shape:
 * {
 *   "request": {
 *     "requestCode":   "200",        ← HTTP status code as string
 *     "resultMessage": "...",        ← Human-readable outcome message
 *     "requestResult": true          ← true = success, false = failure
 *   },
 *   "payload": { ... }               ← Actual response data (null on error)
 * }
 *
 * Usage:
 *   return new BaseResponse(data, 'Done', StatusCodes.OK).send(res);
 *
 * Module responses extend this:
 *   class LoginSuccess extends BaseResponse {
 *     constructor(data) { super(data, 'Login successful', StatusCodes.OK); }
 *   }
 */
class BaseResponse {
  /**
   * @param {*}      payload     - Response data (goes into "payload")
   * @param {string} message     - Outcome message (goes into "request.resultMessage")
   * @param {number} statusCode  - HTTP status code
   * @param {boolean} success    - Explicit success flag (derived from statusCode if omitted)
   */
  constructor(payload = null, message = '', statusCode = StatusCodes.OK, success = null) {
    this.payload    = payload;
    this.message    = message;
    this.statusCode = statusCode;
    this.success    = success !== null ? success : statusCode < 400;
  }

  toJSON() {
    return {
      request: {
        requestCode:   String(this.statusCode),
        resultMessage: this.message,
        requestResult: this.success,
      },
      payload: this.payload,
    };
  }

  /** @param {import('express').Response} res */
  send(res) {
    return res.status(this.statusCode).json(this.toJSON());
  }

  // ── Static convenience factories ──────────────────────────────────────────

  static ok(res, payload, message = 'Success') {
    return new BaseResponse(payload, message, StatusCodes.OK).send(res);
  }

  static created(res, payload, message = 'Created') {
    return new BaseResponse(payload, message, StatusCodes.CREATED).send(res);
  }

  static fail(res, message = 'Error', statusCode = StatusCodes.INTERNAL_SERVER_ERROR, payload = null) {
    return new BaseResponse(payload, message, statusCode, false).send(res);
  }
}

module.exports = BaseResponse;
