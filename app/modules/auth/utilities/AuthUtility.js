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
  async registerUser({ name, email, password }) {
    const { User } = require('@database/models');

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return User.create({ name, email, password: hashedPassword });
  }

  async loginUser(email, password) {
    const { User } = require('@database/models');

    const user = await User.findOne({ where: { email } });
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

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    await user.update({ lastLoginAt: new Date() });

    const token = this.generateToken({ id: user.id, email: user.email, role: user.role });

    return { user, token };
  }

  generateToken(payload) {
    return jwt.sign(payload, appConfig.jwtSecret, { expiresIn: appConfig.jwtExpiresIn });
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
