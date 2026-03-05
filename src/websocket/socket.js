// src/websocket/socket.js
const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log(' New client connected: ${socket.id}`);

    // Flutter app joins a room by userId and role
    // Customer: socket.emit('join', { userId: 'abc', role: 'customer' })
    // Mechanic: socket.emit('join', { userId: 'xyz', role: 'mechanic' })
    socket.on('join', ({ userId, role }) => {
      if (role === 'customer') {
        socket.join(`customer_${userId}`);
        console.log(`Customer ${userId} joined room`);
      } else if (role === 'mechanic') {
        socket.join(`mechanic_${userId}`);
        console.log(`Mechanic ${userId} joined room`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('WebSocket (Socket.IO) initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    console.warn(' Socket.IO not initialized yet');
    return null;
  }
  return io;
};

// initWebSocket alias so Imanjith's server.js still works
const initWebSocket = initSocket;

module.exports = { initSocket, initWebSocket, getIO };
