// src/routes/tow-trucks.routes.js
const express = require('express');
const router = express.Router();
const towTruckController = require('../controllers/tow-trucks.controller');
const { requireAuth } = require('../middleware/auth');


router.post('/request', requireAuth, towTruckController.requestTowTruck);
router.get('/available', requireAuth, towTruckController.getAvailableTowTrucks);


// NOTE: Specific named routes MUST come before /:id
router.get('/flatbed', requireAuth, towTruckController.getFlatbedTowTrucks);
router.get('/hook-chain', requireAuth, towTruckController.getHookChainTowTrucks);
router.get('/wheel-lift', requireAuth, towTruckController.getWheelLiftTowTrucks);
router.put('/accept/:id', requireAuth, towTruckController.acceptTowRequest);


router.get('/:id', requireAuth, towTruckController.getTowTruckProfile);

module.exports = router;
