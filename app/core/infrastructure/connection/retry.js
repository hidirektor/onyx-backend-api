'use strict';

const { TimeoutError } = require('./errors');

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute the next retry delay using full jitter exponential backoff.
 * Jitter prevents thundering-herd when multiple services restart at once.
 *
 * @param {number} attempt   - 1-based attempt number (first failure = 1)
 * @param {number} baseDelay - Base delay in ms
 * @param {number} maxDelay  - Upper cap in ms
 * @returns {number}
 */
function backoff(attempt, baseDelay, maxDelay) {
  const exponential = baseDelay * 2 ** (attempt - 1);
  const capped      = Math.min(exponential, maxDelay);
  return Math.floor(Math.random() * capped); // full jitter
}

/**
 * Retry an async function up to `attempts` times with exponential backoff.
 * Throws the last error if all attempts are exhausted.
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {object}   [opts]
 * @param {string}   [opts.label]      - Human-readable operation name for log messages
 * @param {number}   [opts.attempts]   - Maximum number of attempts (default: 3)
 * @param {number}   [opts.baseDelay]  - Base delay in ms (default: 500)
 * @param {number}   [opts.maxDelay]   - Max delay cap in ms (default: 15 000)
 * @param {Function} [opts.onRetry]    - Optional callback(attempt, error, delayMs)
 * @returns {Promise<T>}
 */
async function withRetry(fn, {
  label     = 'operation',
  attempts  = 3,
  baseDelay = 500,
  maxDelay  = 15000,
  onRetry   = null,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;

      const delay = backoff(attempt, baseDelay, maxDelay);
      console.warn(
        `[Retry] "${label}" failed (attempt ${attempt}/${attempts}): ${err.message} — retrying in ${delay}ms`
      );
      if (onRetry) onRetry(attempt, err, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Race a promise against a hard timeout.
 * Throws `TimeoutError` if the promise does not resolve within `ms`.
 *
 * @template T
 * @param {string}    service - Used in the TimeoutError
 * @param {Promise<T>} promise
 * @param {number}    ms
 * @returns {Promise<T>}
 */
function withTimeout(service, promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(service, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { withRetry, withTimeout, sleep, backoff };
