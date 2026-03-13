// src/websocket/socket.js
// =====================================================
// WebSocket (Socket.IO) Setup
// =====================================================
// Manages real-time communication between:
//   - Customers and mechanics (job status updates)
//   - Dispatch system (offer notifications)
//   - Live location tracking

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with the HTTP server.
 * Called once from server.js
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Customer joins their personal room ──
    // Frontend: socket.emit('join_customer', { customerId: 'uid123' })
    socket.on('join_customer', ({ customerId }) => {
      if (customerId) {
        socket.join(`customer_${customerId}`);
        console.log(`[Socket] Customer ${customerId} joined room`);
      }
    });

    // ── Mechanic joins their personal room ──
    // Frontend: socket.emit('join_mechanic', { mechanicId: 'uid456' })
    socket.on('join_mechanic', ({ mechanicId }) => {
      if (mechanicId) {
        socket.join(`mechanic_${mechanicId}`);
        console.log(`[Socket] Mechanic ${mechanicId} joined room`);
      }
    });

    // ── Mechanic sends live location update ──
    // Frontend: socket.emit('location_update', { mechanicId, lat, lng })
    socket.on('location_update', ({ mechanicId, lat, lng }) => {
      if (mechanicId && lat != null && lng != null) {
        // Broadcast to all clients tracking this mechanic
        io.emit(`location:${mechanicId}`, { lat, lng, timestamp: Date.now() });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO instance anywhere in the app.
 * Usage: const io = getIO(); io.to('room').emit('event', data);
 */
function getIO() {
  if (!io) {
    console.warn('[Socket] Warning: Socket.IO not initialized yet');
    return null;
  }
  return io;
}

module.exports = { initSocket, getIO };
