'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const RedisClient = require('./RedisClient');

let io = null;

/**
 * WebSocketServer - Singleton Socket.IO server with Redis adapter for horizontal scaling.
 *
 * Must call initialize(httpServer) once at bootstrap before any other calls.
 *
 * Usage:
 *   // At bootstrap:
 *   WebSocketServer.initialize(httpServer);
 *
 *   // In notification service:
 *   WebSocketServer.emit(`user:${userId}`, 'notification', data);
 *   WebSocketServer.broadcast('global_event', data);
 */
class WebSocketServer {
  /**
   * Initialize the Socket.IO server. Must be called once at bootstrap.
   * @param {import('http').Server} httpServer
   * @param {object} [options] - Socket.IO server options
   * @returns {import('socket.io').Server}
   */
  static initialize(httpServer, options = {}) {
    if (io) return io;

    const pubClient = RedisClient.getInstance();
    const subClient = RedisClient.getSubscriber();

    io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      ...options,
    });

    io.adapter(createAdapter(pubClient, subClient));
    console.info('[WebSocket] Server initialized with Redis adapter');

    io.on('connection', (socket) => {
      console.info(`[WebSocket] Client connected: ${socket.id}`);

      // Join user-specific room if userId is provided during handshake
      const userId = socket.handshake.auth?.userId;
      if (userId) {
        socket.join(`user:${userId}`);
        console.info(`[WebSocket] Socket ${socket.id} joined room user:${userId}`);
      }

      socket.on('join_room', (room) => {
        socket.join(room);
      });

      socket.on('leave_room', (room) => {
        socket.leave(room);
      });

      socket.on('disconnect', (reason) => {
        console.info(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
      });
    });

    return io;
  }

  /**
   * Get the initialized Socket.IO server instance.
   * @returns {import('socket.io').Server}
   */
  static getInstance() {
    if (!io) {
      throw new Error('[WebSocket] Server not initialized. Call WebSocketServer.initialize(httpServer) first.');
    }
    return io;
  }

  /**
   * Emit an event to all clients in a room.
   * @param {string} room - e.g. 'user:42', 'class:101'
   * @param {string} event
   * @param {*} payload
   */
  static emit(room, event, payload) {
    WebSocketServer.getInstance().to(room).emit(event, payload);
  }

  /**
   * Broadcast an event to ALL connected clients.
   * @param {string} event
   * @param {*} payload
   */
  static broadcast(event, payload) {
    WebSocketServer.getInstance().emit(event, payload);
  }

  /**
   * Get the number of connected clients.
   * @returns {number}
   */
  static getClientCount() {
    const sockets = WebSocketServer.getInstance().sockets.sockets;
    return sockets.size;
  }
}

module.exports = WebSocketServer;
