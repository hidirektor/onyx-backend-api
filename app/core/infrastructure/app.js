'use strict';

// Step 1: Load env vars (.env resolved from process.cwd() = project root)
require('dotenv').config();

// Step 2: Validate all required env vars — exits immediately if any are missing
const validateEnv = require('./configs/env.validator');
validateEnv();

// Step 3: Register module aliases after env is confirmed valid
require('module-alias/register');

const http      = require('http');
const appConfig = require('@infrastructure/configs/app.config');

const { createApp, bootstrap } = require('./bootstrap');

const { app, manager } = createApp();
const httpServer       = http.createServer(app);

bootstrap(httpServer, manager)
  .then(() => {
    httpServer.listen(appConfig.port, () => {
      console.info(`[Server] Running on port ${appConfig.port} [${appConfig.env}]`);
      console.info(`[Server] Health: http://localhost:${appConfig.port}/health`);
    });

    const shutdown = async (signal) => {
      console.info(`[Server] ${signal} received. Shutting down...`);
      httpServer.close(async () => {
        await manager.shutdownAll();
        console.info('[Server] Shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('[Bootstrap] Fatal error during startup:', err);
    process.exit(1);
  });

module.exports = app;
