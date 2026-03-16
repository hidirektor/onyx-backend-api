'use strict';

/**
 * Central enum registry.
 * All enum files are merged here and accessed by key.
 *
 * Usage:
 *   const { getEnumValues, getEnumDefault } = require('@core/domain/enums');
 *   DataTypes.ENUM(...getEnumValues('user.preferences.languages'))
 *   getEnumDefault('user.preferences.languages', 'TURKISH')  // → 'TURKISH'
 */

const ALL_ENUMS = Object.assign(
  {},
  require('./user/preferences.enum'),
  require('./user/users.enum'),
  require('./user/profile-photo-approvals.enum'),
  require('./system/audit/operation-types.enum'),
  require('./system/audit/operation-sections.enum'),
  require('./system/request/language.enum'),
  require('./system/request/device-type.enum'),
  require('./system/notifications.enum'),
  require('./support/support.enum'),
  require('./geo/geo-restrictions.enum'),
  // Timezones and dial codes are arrays, not key-mapped — access directly:
  // require('./user/timezones.enum')         → plain object (use Object.values())
  // require('./user/phone-dial-codes.enum')  → plain array
);

/**
 * Get all values for a registered enum key.
 * @param {string} key
 * @returns {string[]}
 */
function getEnumValues(key) {
  if (!ALL_ENUMS[key]) {
    throw new Error(`[Enum] Unknown enum key: "${key}". Check app/core/domain/enums/index.js`);
  }
  return [...ALL_ENUMS[key]];
}

/**
 * Return `value` if it exists in the enum, otherwise return the first value.
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function getEnumDefault(key, value) {
  const values = getEnumValues(key);
  return values.includes(value) ? value : values[0];
}

/**
 * Check if a value is valid for a given enum.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function isValidEnumValue(key, value) {
  return getEnumValues(key).includes(value);
}

module.exports = { getEnumValues, getEnumDefault, isValidEnumValue, ALL_ENUMS };
