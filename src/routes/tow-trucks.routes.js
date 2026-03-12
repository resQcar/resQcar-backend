// src/routes/tow-trucks.routes.js

const express = require('express');
const router = express.Router();
const towTruckController = require('../controllers/tow-trucks.controller');
const { requireAuth } = require('../middleware/auth');

// Customer requests a tow truck
router.post('/request', requireAuth, towTruckController.requestTowTruck);

// Get all available tow trucks near customer
router.get('/available', requireAuth, towTruckController.getAvailableTowTrucks);

// Get only flatbed trucks
router.get('/flatbed', requireAuth, towTruckController.getFlatbedTowTrucks);

// Get only hook & chain trucks
router.get('/hook-chain', requireAuth, towTruckController.getHookChainTowTrucks);

// Get only wheel lift trucks
router.get('/wheel-lift', requireAuth, towTruckController.getWheelLiftTowTrucks);

// Tow truck driver accepts a request
router.put('/accept/:id', requireAuth, towTruckController.acceptTowRequest);

// Get a specific tow truck's profile
router.get('/:id', requireAuth, towTruckController.getTowTruckProfile);

module.exports = router;