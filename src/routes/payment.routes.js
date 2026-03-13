// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth');

// POST /api/payments/create-intent
router.post('/create-intent', requireAuth, paymentController.createPaymentIntent);

// POST /api/payments/confirm
router.post('/confirm', requireAuth, paymentController.confirmPayment);

// GET /api/payments/history
router.get('/history', requireAuth, paymentController.getPaymentHistory);

// GET /api/payments/customer-history
router.get('/customer-history', requireAuth, paymentController.getServiceHistoryCustomer);

// GET /api/payments/mechanic-history
router.get('/mechanic-history', requireAuth, paymentController.getServiceHistoryMechanic);

// POST /api/payments/ratings
router.post('/ratings', requireAuth, paymentController.submitRating);

// GET /api/payments/mechanics/:id/ratings  (NOTE: must be before /:id/status)
router.get('/mechanics/:id/ratings', requireAuth, paymentController.getMechanicRatings);

// GET /api/payments/:id/status
router.get('/:id/status', requireAuth, paymentController.getPaymentStatus);

module.exports = router;
