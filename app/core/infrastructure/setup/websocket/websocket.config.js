'use strict';

module.exports = {
  cors: {
    origin:  process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },

  transports: ['websocket', 'polling'],

  // Socket.IO keep-alive settings
  pingTimeout:  20000,
  pingInterval: 25000,
};
