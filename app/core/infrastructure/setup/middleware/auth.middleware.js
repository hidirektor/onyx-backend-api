'use strict';

const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const appConfig = require('@infrastructure/setup/configs/app.config');

function deny(res, statusCode, message) {
  return res.status(statusCode).json({
    request: {
      requestCode:   String(statusCode),
      resultMessage: message,
      requestResult: false,
    },
    payload: null,
  });
}

/**
 * Lightweight auth middleware.
 * Verifies Bearer JWT — attaches decoded payload as req.user.
 * No DB round-trip; use authWithUser when you need the full Sequelize instance.
 */
const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return deny(res, StatusCodes.UNAUTHORIZED, 'Authentication required. Provide a Bearer token.');
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, appConfig.jwtSecret);
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired. Please login again.'
      : 'Invalid token.';
    return deny(res, StatusCodes.UNAUTHORIZED, message);
  }
};

/**
 * Auth middleware with full DB user lookup.
 * Use when req.user must be a Sequelize User model instance.
 */
const authWithUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return deny(res, StatusCodes.UNAUTHORIZED, 'Authentication required.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, appConfig.jwtSecret);
    const { User } = require('@database/models');
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return deny(res, StatusCodes.UNAUTHORIZED, 'User not found or account disabled.');
    }

    req.user = user;
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired. Please login again.'
      : 'Invalid token.';
    return deny(res, StatusCodes.UNAUTHORIZED, message);
  }
};

module.exports = auth;
module.exports.withUser = authWithUser;
