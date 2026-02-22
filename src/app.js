require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./config/firebase"); // initialize firebase on startup

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(cors());
app.use(express.json());

// serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => res.send("resQcar backend running ✅"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ message: err.message || "Server error" });
});

module.exports = app;