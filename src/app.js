// src/app.js
const express = require("express");
const cors = require("cors");

const bookingsRoutes = require("./routes/bookings.routes");
const jobsRoutes = require("./routes/jobs.routes"); 

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/bookings", bookingsRoutes);
app.use("/api/jobs", jobsRoutes); 

module.exports = { app };