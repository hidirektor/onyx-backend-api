'use strict';

const { isCelebrateError } = require('celebrate');
const { StatusCodes }      = require('http-status-codes');
const logger               = require('@shared/utils/logger');

function envelope(statusCode, message, payload = null) {
  return {
    request: {
      requestCode:   String(statusCode),
      resultMessage: message,
      requestResult: false,
    },
    payload,
  };
}

function respond(res, statusCode, message, payload = null) {
  return res.status(statusCode).json(envelope(statusCode, message, payload));
}

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // Malformed JSON body (SyntaxError from body-parser)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return respond(res, StatusCodes.BAD_REQUEST, 'Malformed JSON in request body');
  }

  // Celebrate (Joi) validation errors
  if (isCelebrateError(err)) {
    const errors = [];
    for (const [, joiError] of err.details.entries()) {
      joiError.details.forEach((d) => errors.push(d.message.replace(/['"]/g, '')));
    }
    return respond(res, StatusCodes.UNPROCESSABLE_ENTITY, 'Validation failed', { errors });
  }

  // Sequelize UniqueConstraintError
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => `${e.path} already exists`);
    return respond(res, StatusCodes.CONFLICT, 'A record with these details already exists', { errors });
  }

  // Sequelize ValidationError
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => e.message);
    return respond(res, StatusCodes.UNPROCESSABLE_ENTITY, 'Database validation failed', { errors });
  }

  // JWT errors (belt-and-suspenders — normally caught in auth middleware)
  if (err.name === 'TokenExpiredError') {
    return respond(res, StatusCodes.UNAUTHORIZED, 'Token expired. Please login again.');
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return respond(res, StatusCodes.UNAUTHORIZED, 'Invalid token.');
  }

  const statusCode = err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message    = err.message || 'Internal server error';

  logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`, {
    stack:  err.stack,
    user:   req.user?.id || null,
    name:   err.name,
  });

  return respond(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};
