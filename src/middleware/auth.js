// src/middleware/auth.js
const admin = require("../config/firebase");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Missing Authorization header. Use: Bearer <token>",
      });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized. Invalid/expired token.",
      error: String(err?.message || err),
    });
  }
}

module.exports = { requireAuth };
