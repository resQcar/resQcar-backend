// src/routes/tow-trucks.routes.js
// =====================================================
// Routes - URL Definitions for Tow Truck Endpoints
// =====================================================
// Think of routes as a "menu" - they list all available
// actions and which controller function handles each one.
//
// FORMAT: router.METHOD('/path', middleware, controllerFunction)
//   METHOD = get, post, put, delete
//   middleware = authenticate (check login)
//   controllerFunction = the function that does the work

const express = require('express');
const router = express.Router();
const towTruckController = require('../controllers/tow-trucks.controller');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// 🔴 HIGH PRIORITY ROUTES
// ─────────────────────────────────────────────────────────

// Customer requests a tow truck
// POST http://localhost:3000/api/tow-trucks/request
router.post('/request', authenticate, towTruckController.requestTowTruck);

// Get all available tow trucks near customer
// GET http://localhost:3000/api/tow-trucks/available?latitude=6.9271&longitude=79.8612
// GET http://localhost:3000/api/tow-trucks/available?latitude=6.9271&longitude=79.8612&type=flatbed
router.get('/available', authenticate, towTruckController.getAvailableTowTrucks);

// ─────────────────────────────────────────────────────────
// 🟡 MEDIUM PRIORITY ROUTES
// Note: These specific routes MUST come BEFORE the /:id route below
// ─────────────────────────────────────────────────────────

// Get only flatbed trucks
// GET http://localhost:3000/api/tow-trucks/flatbed?latitude=6.9271&longitude=79.8612
router.get('/flatbed', authenticate, towTruckController.getFlatbedTowTrucks);

// Get only hook & chain trucks
// GET http://localhost:3000/api/tow-trucks/hook-chain?latitude=6.9271&longitude=79.8612
router.get('/hook-chain', authenticate, towTruckController.getHookChainTowTrucks);

// Get only wheel lift trucks
// GET http://localhost:3000/api/tow-trucks/wheel-lift?latitude=6.9271&longitude=79.8612
router.get('/wheel-lift', authenticate, towTruckController.getWheelLiftTowTrucks);

// Tow truck driver accepts a request
// PUT http://localhost:3000/api/tow-trucks/accept/req123
router.put('/accept/:id', authenticate, towTruckController.acceptTowRequest);

// ─────────────────────────────────────────────────────────
// 🟢 LOW PRIORITY ROUTES
// IMPORTANT: This /:id route must be LAST - it's a "catch-all"
// If placed first, it would catch /flatbed, /hook-chain etc.
// ─────────────────────────────────────────────────────────

// Get a specific tow truck's profile
// GET http://localhost:3000/api/tow-trucks/tow123
router.get('/:id', authenticate, towTruckController.getTowTruckProfile);

module.exports = router;
