// src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Initialize Firebase Admin once
require("./config/firebase");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve uploads (AFTER app is created)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes (example)
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/", (req, res) => res.send("resQcar backend running ✅"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
