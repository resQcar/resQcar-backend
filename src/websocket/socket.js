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

    // ── Customer subscribes to a specific mechanic's live location ──
    // Call this from the Flutter map screen after a booking is accepted.
    // Frontend: socket.emit('join_tracking', { mechanicId: 'uid456' })
    socket.on('join_tracking', ({ mechanicId }) => {
      if (mechanicId) {
        socket.join(`tracking_${mechanicId}`);
        console.log(`[Socket] Client ${socket.id} subscribed to live tracking for mechanic ${mechanicId}`);
      }
    });

    // ── Mechanic sends live location update ──
    // FIX: Was io.emit() which broadcast to ALL connected clients (security/performance issue).
    // Now correctly targets only clients that called join_tracking for this mechanic.
    // Frontend: socket.emit('location_update', { mechanicId, lat, lng })
    socket.on('location_update', ({ mechanicId, lat, lng }) => {
      if (mechanicId && lat != null && lng != null) {
        io.to(`tracking_${mechanicId}`).emit(`location:${mechanicId}`, {
          lat,
          lng,
          timestamp: Date.now(),
        });
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