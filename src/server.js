const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express(); // ✅ app must be initialized BEFORE app.use()

// Middlewares
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

// ✅ Error handler (keep at bottom)
app.use((err, req, res, next) => {
  if (!err) return next();
  const status = err.statusCode || err.status || 400;
  res.status(status).json({ message: err.message || "Request failed." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));