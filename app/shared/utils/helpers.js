'use strict';

/**
 * General-purpose utility helpers.
 */

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a random alphanumeric string.
 * @param {number} length
 * @returns {string}
 */
const randomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Safely parse JSON without throwing.
 * @param {string} str
 * @param {*} fallback
 * @returns {*}
 */
const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Remove undefined/null keys from an object (shallow).
 * @param {object} obj
 * @returns {object}
 */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

/**
 * Pick specific keys from an object.
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) acc[key] = obj[key];
    return acc;
  }, {});

/**
 * Omit specific keys from an object.
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
const omit = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Convert a value to a boolean.
 * Handles string 'true'/'false', numbers 0/1, and actual booleans.
 * @param {*} value
 * @returns {boolean}
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

/**
 * Paginate an in-memory array.
 * @param {any[]} array
 * @param {number} page - 1-based
 * @param {number} limit
 * @returns {{ data: any[], total: number, page: number, totalPages: number }}
 */
const paginateArray = (array, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    data: array.slice(offset, offset + limit),
    total: array.length,
    page,
    totalPages: Math.ceil(array.length / limit),
  };
};

module.exports = {
  sleep,
  randomString,
  safeJsonParse,
  compact,
  pick,
  omit,
  capitalize,
  toBoolean,
  paginateArray,
};
