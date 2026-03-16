'use strict';

const express              = require('express');
const cors                 = require('cors');
const { json, urlencoded } = require('body-parser');
const path                 = require('path');

const ConnectionManager    = require('@infrastructure/connection/connection.manager');
const NotificationEngine   = require('@services/notification/NotificationEngine');
const MigrationService     = require('@services/migration/MigrationService');

const loggerMiddleware     = require('@infrastructure/setup/middleware/logger.middleware');
const errorMiddleware      = require('@infrastructure/setup/middleware/error.middleware');
const deviceTypeMiddleware = require('@infrastructure/setup/middleware/device-type.middleware');
const languageMiddleware   = require('@infrastructure/setup/middleware/language.middleware');
const appConfig            = require('@infrastructure/configs/app.config');

const AuthModule = require('@modules/auth/AuthModule');

/**
 * Creates the Express app and the ConnectionManager instance.
 * Called before the HTTP server is created so the app is ready to attach.
 *
 * @returns {{ app: import('express').Application, manager: ConnectionManager }}
 */
function createApp() {
  const manager = new ConnectionManager();
  const app     = express();

  // ─── Base middleware ────────────────────────────────────────────────────────
  app.use(cors({ origin: appConfig.corsOrigin }));
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(loggerMiddleware);
  app.use('/public', express.static(path.resolve(__dirname, '../../shared/public')));

  // ─── Protocol headers ───────────────────────────────────────────────────────
  app.use(deviceTypeMiddleware); // X-Device-Type: required (web | mobile | agent)
  app.use(languageMiddleware);   // X-Accept-Language: optional (en | tr | auto)

  // ─── Health check ───────────────────────────────────────────────────────────
  app.get('/health', async (req, res) => {
    const services = await manager.health();
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
        services,
      },
    });
  });

  // ─── Modules ─────────────────────────────────────────────────────────────────
  [
    AuthModule,
    // Add future modules here
  ].forEach((mod) => mod.register(app));

  // ─── 404 ─────────────────────────────────────────────────────────────────────
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

  // ─── Global error handler (must be last) ────────────────────────────────────
  app.use(errorMiddleware);

  return { app, manager };
}

/**
 * Runs all async bootstrap steps after the HTTP server is created.
 * Order: infrastructure connections → migration → notification consumers.
 *
 * @param {import('http').Server}  httpServer
 * @param {ConnectionManager}      manager
 */
async function bootstrap(httpServer, manager) {
  await manager.initializeAll(httpServer);

  const migrator = new MigrationService({ alter: true });
  await migrator.run();

  await NotificationEngine.startConsumer();
}

module.exports = { createApp, bootstrap };
