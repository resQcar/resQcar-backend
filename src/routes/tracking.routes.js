const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { requireAuth } = require('../middleware/auth');

// Update mechanic's live location
router.post('/update-location', requireAuth, trackingController.updateMechanicLocation);

module.exports = router;