// src/server.js
const http = require('http');
const app = require('./app');
const { initSocket } = require('./websocket/socket');

const server = http.createServer(app);

// Initialize Socket.IO WebSocket
const io = initSocket(server);
app.locals.wsHub = io;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
