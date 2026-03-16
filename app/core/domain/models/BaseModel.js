'use strict';

const { Model } = require('sequelize');

/**
 * BaseModel - Extended Sequelize Model with shared helpers.
 * All database models extend this instead of Sequelize's Model directly.
 *
 * Features:
 * - hiddenFields: strips sensitive fields from public serialization
 * - toPublicJSON(): returns a sanitized plain object safe to send to clients
 * - paginate(): static helper wrapping findAndCountAll with offset/limit
 */
class BaseModel extends Model {
  /**
   * Fields to exclude from public serialization.
   * Override in child models to add model-specific hidden fields.
   * @returns {string[]}
   */
  static get hiddenFields() {
    return ['password', 'deletedAt'];
  }

  /**
   * Returns a plain object with hidden fields removed.
   * Safe to send directly to API consumers.
   * @returns {object}
   */
  toPublicJSON() {
    const raw = this.toJSON();
    const hidden = this.constructor.hiddenFields || [];
    hidden.forEach((field) => delete raw[field]);
    return raw;
  }

  /**
   * Paginated query wrapper around findAndCountAll.
   * @param {object} options - Sequelize query options
   * @param {number} page - 1-based page number
   * @param {number} limit - Records per page
   * @returns {Promise<{ rows: BaseModel[], count: number }>}
   */
  static paginate(options = {}, page = 1, limit = 20) {
    const offset = (Math.max(1, page) - 1) * limit;
    return this.findAndCountAll({ ...options, limit, offset });
  }
}

module.exports = BaseModel;
