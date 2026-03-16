'use strict';

const logger = require('@shared/utils/logger');

/**
 * InAppProvider - Delivers real-time in-app notifications via WebSocket.
 *
 * Clients must join their user-specific room on connection:
 *   socket.join(`user:${userId}`)
 * This is handled automatically in WebSocketServer.js if userId is
 * provided in socket.handshake.auth.userId.
 *
 * Expected payload:
 *   { userId: string|number, event?: string, data: object }
 */
class InAppProvider {
  /**
   * @param {{ userId: string|number, event?: string, data: object }} payload
   */
  async send({ userId, event = 'notification', data }) {
    if (!userId) throw new Error('[InAppProvider] userId is required');

    // Lazy-load to avoid circular dependency during bootstrap
    const WebSocketServer = require('@core/infrastructure/setup/websocket/websocket.server');

    try {
      WebSocketServer.emit(`user:${userId}`, event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.info(`[InAppProvider] In-app notification sent to user:${userId}`, { event });
      return { provider: 'inapp', status: 'sent', userId, event };
    } catch (err) {
      // WebSocket may not be initialized in test environments
      logger.warn(`[InAppProvider] Could not send to user:${userId} - ${err.message}`);
      return { provider: 'inapp', status: 'skipped', userId, reason: err.message };
    }
  }
}

module.exports = InAppProvider;
