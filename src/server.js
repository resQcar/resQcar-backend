// src/server.js
require("dotenv").config();
const http = require("http");
const { app } = require("./app");
const { initWebSocket } = require("./websocket/socket");

const server = http.createServer(app);
const wsHub = initWebSocket(server);

// so controllers can use wsHub
app.locals.wsHub = wsHub;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API running on :${PORT}`));