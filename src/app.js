// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Firebase Admin once
require('./config/firebase');

const app = express();

// Middlewares
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8081'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health checks
app.get('/', (req, res) => res.send('resQcar backend running'));
app.get('/health', (req, res) => res.json({ ok: true }));

// Auth routes (Supuni)
app.use('/api/auth', require('./routes/auth.routes'));

// User routes (Supuni)
app.use('/api/users', require('./routes/users.routes'));

// Bookings routes (Imanjith + Nicol combined)
app.use('/api/bookings', require('./routes/bookings.routes'));

// Mechanic dashboard routes (Nicol)
app.use('/api/mechanics', require('./routes/mechanic.routes'));

// Jobs routes (Imanjith + Shevon)
app.use('/api/jobs', require('./routes/jobs.routes'));

// Payment routes (Devi)
app.use('/api/payments', require('./routes/payment.routes'));

// Tracking routes (Shevon)
app.use('/api/tracking', require('./routes/tracking.routes'));

// Tow truck routes
app.use('/api/tow-trucks', require('./routes/tow-trucks.routes'));

// Service history routes (Devi)
app.use('/api/service-history', require('./routes/service-history.routes'));

// Ratings routes (Devi)
app.use('/api/ratings', require('./routes/ratings.routes'));

// Car tips routes
app.use('/api/car-tips', require('./routes/car-tips.routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

module.exports = app;