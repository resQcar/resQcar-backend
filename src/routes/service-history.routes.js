// src/routes/service-history.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

// GET /api/service-history/customer  — Devi's workload requirement
router.get('/customer', requireAuth, paymentController.getServiceHistoryCustomer);

// GET /api/service-history/mechanic  — Devi's workload requirement
router.get('/mechanic', requireAuth, paymentController.getServiceHistoryMechanic);

module.exports = router;