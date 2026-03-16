'use strict';

const BaseModule = require('@core/base/module/BaseModule');
const router = require('./routes');

class AuthModule extends BaseModule {
  getName()    { return 'auth'; }
  getVersion() { return 'v1'; }
  getRoutes()  { return router; }
}

module.exports = new AuthModule();
