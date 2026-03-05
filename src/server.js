// src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Initialize Firebase Admin once
require("./config/firebase");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));

// Health check
app.get("/", (req, res) => res.send("resQcar backend running ✅"));

// Global error handler
app.use((err, req, res, next) => {
  if (!err) return next();
  const status = err.statusCode || err.status || 400;
  res.status(status).json({ message: err.message || "Request failed." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
