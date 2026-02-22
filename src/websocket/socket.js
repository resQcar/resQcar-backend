// src/websocket/socket.js
const WebSocket = require("ws");

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });
  const channels = new Map(); // channel -> Set(ws)

  function join(ws, channel) {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel).add(ws);
    ws.__channels = ws.__channels || new Set();
    ws.__channels.add(channel);
  }

  function leaveAll(ws) {
    if (!ws.__channels) return;
    for (const ch of ws.__channels) {
      const set = channels.get(ch);
      if (set) set.delete(ws);
      if (set && set.size === 0) channels.delete(ch);
    }
  }

  function emit(channel, payload) {
    const set = channels.get(channel);
    if (!set) return;
    const msg = JSON.stringify(payload);
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        // Client sends: { "type":"join", "channel":"mechanic:mechanic_1" }
        if (data.type === "join" && typeof data.channel === "string") {
          join(ws, data.channel);
          ws.send(JSON.stringify({ type: "joined", channel: data.channel }));
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });

    ws.on("close", () => leaveAll(ws));
  });

  return { emit };
}

module.exports = { initWebSocket };