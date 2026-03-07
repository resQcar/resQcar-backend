const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const { authenticate } = require('../middleware/auth');

// Update mechanic's live location
router.post('/update-location', authenticate, trackingController.updateMechanicLocation);

module.exports = router;