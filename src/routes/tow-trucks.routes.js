// src/routes/tow-trucks.routes.js
const express = require('express');
const router = express.Router();
const towTruckController = require('../controllers/tow-trucks.controller');
const { requireAuth } = require('../middleware/auth');

// 🔴 HIGH PRIORITY
router.post('/request', requireAuth, towTruckController.requestTowTruck);
router.get('/available', requireAuth, towTruckController.getAvailableTowTrucks);

// 🟡 MEDIUM PRIORITY
// NOTE: Specific named routes MUST come before /:id
router.get('/flatbed', requireAuth, towTruckController.getFlatbedTowTrucks);
router.get('/hook-chain', requireAuth, towTruckController.getHookChainTowTrucks);
router.get('/wheel-lift', requireAuth, towTruckController.getWheelLiftTowTrucks);
router.put('/accept/:id', requireAuth, towTruckController.acceptTowRequest);

// 🟢 LOW PRIORITY
router.get('/:id', requireAuth, towTruckController.getTowTruckProfile);

module.exports = router;
