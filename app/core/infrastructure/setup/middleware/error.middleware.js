'use strict';

const { isCelebrateError } = require('celebrate');
const { StatusCodes } = require('http-status-codes');
const logger = require('@shared/utils/logger');

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

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // Celebrate (Joi) validation errors
  if (isCelebrateError(err)) {
    const errors = [];
    for (const [, joiError] of err.details.entries()) {
      joiError.details.forEach((d) => errors.push(d.message.replace(/['"]/g, '')));
    }
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json(envelope(StatusCodes.UNPROCESSABLE_ENTITY, 'Validation failed', { errors }));
  }

  // Sequelize UniqueConstraintError
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => `${e.path} already exists`);
    return res
      .status(StatusCodes.CONFLICT)
      .json(envelope(StatusCodes.CONFLICT, 'A record with these details already exists', { errors }));
  }

  // Sequelize ValidationError
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => e.message);
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json(envelope(StatusCodes.UNPROCESSABLE_ENTITY, 'Database validation failed', { errors }));
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

  logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.message}`, {
    stack: err.stack,
    user: req.user?.id || null,
  });

  return res.status(statusCode).json(
    envelope(
      statusCode,
      err.message || 'Internal server error',
      process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
    )
  );
};
