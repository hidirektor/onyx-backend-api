'use strict';

const { Server }        = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const RedisClient       = require('../redis/redis.client');
const wsConfig          = require('./websocket.config');

let io        = null;
let subClient = null; // dedicated subscriber — kept for cleanup

/**
 * WebSocketServer - Singleton Socket.IO server with Redis adapter for horizontal scaling.
 *
 * Must call initialize(httpServer) once at bootstrap before any other calls.
 *
 * Usage:
 *   await WebSocketServer.initialize(httpServer);
 *   WebSocketServer.emit(`user:${userId}`, 'notification', data);
 *   WebSocketServer.broadcast('global_event', data);
 */
class WebSocketServer {
  /**
   * Initialize the Socket.IO server. Must be called once at bootstrap.
   * Creates a dedicated Redis subscriber via duplicate() + connect() before
   * attaching the adapter — prevents "Stream isn't writeable" errors.
   *
   * @param {import('http').Server} httpServer
   * @param {object} [options] - Socket.IO server options (merged with wsConfig)
   * @returns {Promise<import('socket.io').Server>}
   */
  static async initialize(httpServer, options = {}) {
    if (io) return io;

    io = new Server(httpServer, {
      ...wsConfig,
      ...options,
    });

    // Attach Redis adapter only when Redis is available
    const pubClient = RedisClient.getInstance();

    if (pubClient) {
      try {
        // Duplicate the already-connected publisher so the subscriber
        // inherits the same config, then explicitly connect it before
        // handing it to the adapter (required when lazyConnect: true).
        subClient = pubClient.duplicate();
        await subClient.connect();

        io.adapter(createAdapter(pubClient, subClient));
        console.info('[WebSocket] Server initialized with Redis adapter');
      } catch (err) {
        console.warn('[WebSocket] Redis adapter setup failed — running single-node:', err.message);
        subClient = null;
      }
    } else {
      console.warn('[WebSocket] Redis not available — running without Redis adapter (single-node only)');
    }

    io.on('connection', (socket) => {
      console.info(`[WebSocket] Client connected: ${socket.id}`);

      const userId = socket.handshake.auth?.userId;
      if (userId) {
        socket.join(`user:${userId}`);
        console.info(`[WebSocket] Socket ${socket.id} joined room user:${userId}`);
      }

      socket.on('join_room', (room) => {
        if (typeof room !== 'string' || room.trim() === '') {
          socket.emit('error', { message: 'join_room: room must be a non-empty string' });
          return;
        }
        socket.join(room.trim());
      });

      socket.on('leave_room', (room) => {
        if (typeof room !== 'string' || room.trim() === '') {
          socket.emit('error', { message: 'leave_room: room must be a non-empty string' });
          return;
        }
        socket.leave(room.trim());
      });

      socket.on('error', (err) => {
        console.error(`[WebSocket] Socket error (${socket.id}):`, err.message);
      });

      socket.on('disconnect', (reason) => {
        console.info(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
      });
    });

    return io;
  }

  /**
   * @returns {import('socket.io').Server}
   * @throws {Error} if not initialized
   */
  static getInstance() {
    if (!io) {
      throw new Error('[WebSocket] Server not initialized. Call WebSocketServer.initialize(httpServer) first.');
    }
    return io;
  }

  /**
   * Emit an event to all clients in a room.
   * @param {string} room - e.g. 'user:42'
   * @param {string} event
   * @param {*}      payload
   */
  static emit(room, event, payload) {
    WebSocketServer.getInstance().to(room).emit(event, payload);
  }

  /**
   * Broadcast an event to ALL connected clients.
   * @param {string} event
   * @param {*}      payload
   */
  static broadcast(event, payload) {
    WebSocketServer.getInstance().emit(event, payload);
  }

  /** @returns {number} */
  static getClientCount() {
    return io ? io.sockets.sockets.size : 0;
  }

  /** @returns {{ status: string, service: string, clients?: number }} */
  static getHealth() {
    if (!io) return { status: 'unavailable', service: 'websocket' };
    return {
      status:  'healthy',
      service: 'websocket',
      clients: WebSocketServer.getClientCount(),
    };
  }

  /**
   * Gracefully close the Socket.IO server and the subscriber connection.
   * @returns {Promise<void>}
   */
  static async close() {
    await new Promise((resolve) => {
      if (!io) return resolve();
      io.close(() => {
        io = null;
        console.info('[WebSocket] Server closed');
        resolve();
      });
    });

    if (subClient) {
      await subClient.quit().catch(() => {});
      subClient = null;
    }
  }
}

module.exports = WebSocketServer;
