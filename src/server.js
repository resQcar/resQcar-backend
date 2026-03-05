// src/server.js
const http = require("http");
const app = require("./app");
const { initWebSocket } = require("./websocket/socket");

const server = http.createServer(app);

// Initialize WebSocket
const wsHub = initWebSocket(server);
app.locals.wsHub = wsHub;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
