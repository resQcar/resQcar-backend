const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { requireAuth } = require('../middleware/auth');

// Update mechanic's live location
router.post('/update-location', requireAuth, trackingController.updateMechanicLocation);

// Get mechanic's live location (for customer)
router.get('/mechanic/:id', requireAuth, trackingController.getLiveLocation);

// Calculate ETA between two points
router.get('/eta', requireAuth, trackingController.getETA);

module.exports = router;
