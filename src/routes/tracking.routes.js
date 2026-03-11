const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { requireAuth } = require('../middleware/auth');

// POST - Update mechanic's live location
router.post('/update-location', requireAuth, trackingController.updateMechanicLocation);

// GET - Get mechanic's live location (for customer)
router.get('/mechanic/:id', requireAuth, trackingController.getLiveLocation);

// GET - Calculate ETA between two points
router.get('/eta', requireAuth, trackingController.getETA);

module.exports = router;
