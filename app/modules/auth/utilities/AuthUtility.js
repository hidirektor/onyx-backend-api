'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const appConfig = require('@infrastructure/setup/configs/app.config');

const SALT_ROUNDS = 12;

/**
 * AuthUtility - Business logic for authentication operations.
 * Handles registration, login, token generation/verification, and password hashing.
 */
class AuthUtility {
  async loginUser(eMail, password) {
    const { User } = require('@database/models');

    const user = await User.findOne({ where: { eMail } });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Your account has been disabled. Contact support.');
      err.statusCode = 403;
      throw err;
    }

    if (!user.password) {
      const err = new Error('Password authentication is not available for this account');
      err.statusCode = 401;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = this.generateToken({ id: user.userID, eMail: user.eMail, userType: user.userType });

    return { user, token };
  }

  generateToken(payload) {
    return jwt.sign(payload, appConfig.jwtSecret);
  }

  verifyToken(token) {
    return jwt.verify(token, appConfig.jwtSecret);
  }

  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = AuthUtility;
