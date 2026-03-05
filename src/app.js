require('dotenv').config();
require('./config/firebase'); // Initialize Firebase

const express = require('express');
const cors = require('cors');

const mechanicRoutes = require('./routes/mechanic.routes');
const bookingRoutes = require('./routes/bookings.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/jobs', bookingRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ResQCar Backend is running 🚗' });
});

module.exports = app;
