// src/routes/tracking.routes.js
const express = require('express');
const router  = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { requireAuth } = require('../middleware/auth');

// POST /api/tracking/update-location
// Mechanic sends live GPS ping — writes to Realtime DB + Firestore
router.post('/update-location', requireAuth, trackingController.updateMechanicLocation);

// GET /api/tracking/mechanic/:id
// Get mechanic's last known location from Realtime DB (REST poll)
router.get('/mechanic/:id', requireAuth, trackingController.getLiveLocation);

// GET /api/tracking/booking/:bookingId
// PRIMARY Flutter map endpoint — returns booking + mechanic profile + live location
router.get('/booking/:bookingId', requireAuth, trackingController.getBookingTracking);

// GET /api/tracking/booking/:bookingId/location
// Clean dedicated endpoint — returns ONLY the pickup location for a booking
// Reviewer suggestion: clean single-purpose location endpoint
router.get('/booking/:bookingId/location', requireAuth, trackingController.getBookingLocation);

// GET /api/tracking/eta?lat1=&lon1=&lat2=&lon2=
// Calculate distance and ETA between two GPS points
router.get('/eta', requireAuth, trackingController.getETA);

module.exports = router;