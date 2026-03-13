// src/routes/ratings.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

// POST /api/ratings              — Devi's workload requirement
router.post('/', requireAuth, paymentController.submitRating);

// GET  /api/ratings/mechanic/:id — Devi's workload requirement
router.get('/mechanic/:id', requireAuth, paymentController.getMechanicRatings);

module.exports = router;