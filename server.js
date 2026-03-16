'use strict';

// Step 1: Load env vars
require('dotenv').config();

// Step 2: Validate all required env vars — exits immediately if any are missing
const validateEnv = require('./app/core/infrastructure/setup/configs/env.validator');
validateEnv();

// Step 3: Register module aliases after env is confirmed valid
require('module-alias/register');

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { json, urlencoded } = require('body-parser');
const path    = require('path');

// ─── Infrastructure ────────────────────────────────────────────────────────────
const ConnectionManager  = require('@infrastructure/connection.manager');
const NotificationEngine = require('@services/notification/NotificationEngine');
const MigrationService   = require('@services/migration/MigrationService');

// ─── Modules ───────────────────────────────────────────────────────────────────
const AuthModule = require('@modules/auth/AuthModule');

// ─── Middleware ────────────────────────────────────────────────────────────────
const loggerMiddleware     = require('@infrastructure/setup/middleware/logger.middleware');
const errorMiddleware      = require('@infrastructure/setup/middleware/error.middleware');
const geoProtection        = require('@infrastructure/setup/middleware/geo-protection.middleware');
const deviceTypeMiddleware = require('@infrastructure/setup/middleware/device-type.middleware');
const languageMiddleware   = require('@infrastructure/setup/middleware/language.middleware');

// ─── Config ────────────────────────────────────────────────────────────────────
const appConfig = require('@infrastructure/setup/configs/app.config');

const app        = express();
const httpServer = http.createServer(app);
const manager    = new ConnectionManager();

async function bootstrap() {
  // 1. Base middleware
  app.use(cors({ origin: appConfig.corsOrigin }));
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(loggerMiddleware);
  app.use('/public', express.static(path.join(__dirname, 'app/shared/public')));

  // 1a. Security & protocol headers (applied globally, before any route)
  app.use(geoProtection);        // VPN/proxy + country whitelist/blacklist
  app.use(deviceTypeMiddleware); // X-Device-Type: required (web | mobile | agent)
  app.use(languageMiddleware);   // X-Accept-Language: optional (en | tr | auto)

  // 2. All infrastructure connections
  await manager.initializeAll(httpServer);

  // 3. Schema migration
  const migrator = new MigrationService({ alter: true });
  await migrator.run();

  // 4. Notification engine consumers
  await NotificationEngine.startConsumer();

  // 5. Health check
  app.get('/health', (req, res) => {
    res.json({
      request: {
        requestCode:   '200',
        resultMessage: 'Service is healthy',
        requestResult: true,
      },
      payload: {
        environment: appConfig.env,
        uptime:      Math.floor(process.uptime()),
        timestamp:   new Date().toISOString(),
      },
    });
  });

  // 6. Module registration
  [
    AuthModule,
    // Add future modules here
  ].forEach((mod) => mod.register(app));

  // 7. 404 handler
  app.use((req, res) => {
    res.status(404).json({
      request: {
        requestCode:   '404',
        resultMessage: `Route ${req.method} ${req.originalUrl} not found`,
        requestResult: false,
      },
      payload: null,
    });
  });

  // 8. Global error handler (must be last)
  app.use(errorMiddleware);

  // 9. Start
  httpServer.listen(appConfig.port, () => {
    console.info(`[Server] Running on port ${appConfig.port} [${appConfig.env}]`);
    console.info(`[Server] Health: http://localhost:${appConfig.port}/health`);
  });

  // Graceful shutdown
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
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error during startup:', err);
  process.exit(1);
});

module.exports = app;
