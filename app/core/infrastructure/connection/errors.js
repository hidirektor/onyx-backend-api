'use strict';

/**
 * Base class for all infrastructure-level errors.
 * Carries the service name so callers can filter by service.
 */
class InfrastructureError extends Error {
  /**
   * @param {string} service  - Service label ('redis', 'rabbitmq', etc.)
   * @param {string} message
   * @param {{ cause?: Error }} [options]
   */
  constructor(service, message, { cause } = {}) {
    super(`[${service.toUpperCase()}] ${message}`);
    this.name    = this.constructor.name;
    this.service = service;
    if (cause) this.cause = cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Thrown when a network / socket connection cannot be established or is lost. */
class ConnectionError extends InfrastructureError {
  constructor(service, message, options) {
    super(service, message, options);
  }
}

/** Thrown when a service fails to become ready during bootstrap. */
class InitializationError extends InfrastructureError {
  constructor(service, message, options) {
    super(service, message, options);
  }
}

/** Thrown when an initialization step exceeds its allowed time budget. */
class TimeoutError extends InfrastructureError {
  /**
   * @param {string} service
   * @param {number} timeoutMs
   */
  constructor(service, timeoutMs) {
    super(service, `Initialization timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when a health check call fails. */
class HealthCheckError extends InfrastructureError {
  constructor(service, message, options) {
    super(service, message, options);
  }
}

/** Thrown when a graceful shutdown step fails. */
class ShutdownError extends InfrastructureError {
  constructor(service, message, options) {
    super(service, message, options);
  }
}

module.exports = {
  InfrastructureError,
  ConnectionError,
  InitializationError,
  TimeoutError,
  HealthCheckError,
  ShutdownError,
};
