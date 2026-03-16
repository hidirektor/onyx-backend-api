'use strict';

/**
 * BaseModule - Abstract base class for all feature modules.
 * Every module MUST extend this and implement getName() + getRoutes().
 */
class BaseModule {
  constructor() {
    if (new.target === BaseModule) {
      throw new Error('BaseModule is abstract and cannot be instantiated directly.');
    }
  }

  /** @abstract @returns {string} e.g. 'auth' */
  getName() {
    throw new Error(`${this.constructor.name} must implement getName()`);
  }

  /** @returns {string} e.g. 'v1' */
  getVersion() {
    throw new Error(`${this.constructor.name} must implement getVersion()`);
  }

  /** @abstract @returns {import('express').Router} */
  getRoutes() {
    throw new Error(`${this.constructor.name} must implement getRoutes()`);
  }

  /** @returns {string} e.g. '/api/v1/auth' */
  getBasePath() {
    return `/api/${this.getVersion()}/${this.getName()}`;
  }

  /** @param {import('express').Application} app */
  register(app) {
    app.use(this.getBasePath(), this.getRoutes());
    console.info(`[Module] ${this.constructor.name} registered at ${this.getBasePath()}`);
  }
}

module.exports = BaseModule;
