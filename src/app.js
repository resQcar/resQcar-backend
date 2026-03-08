// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Firebase Admin once
require('./config/firebase');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health checks
app.get('/', (req, res) => res.send('resQcar backend running'));
app.get('/health', (req, res) => res.json({ ok: true }));

// Auth routes (Supuni)
app.use('/api/auth', require('./routes/auth.routes'));

// User routes (users.routes.js is the correct one)
app.use('/api/users', require('./routes/users.routes'));

// Bookings routes (Imanjith + Nicol combined)
app.use('/api/bookings', require('./routes/bookings.routes'));

// Mechanic dashboard routes (Nicol)
app.use('/api/mechanics', require('./routes/mechanic.routes'));

// Jobs routes (Imanjith)
app.use('/api/jobs', require('./routes/jobs.routes'));

// Payment routes (Devi)
app.use('/api/payments', require('./routes/payment.routes'));

//
app.use('/api/tracking', require('./routes/tracking.routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

module.exports = app;
