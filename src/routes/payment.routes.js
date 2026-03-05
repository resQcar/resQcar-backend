// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// POST /api/payments/create-intent          -> create a Stripe payment intent
router.post('/create-intent', paymentController.createPaymentIntent);

// POST /api/payments/confirm                -> confirm a Stripe payment
router.post('/confirm', paymentController.confirmPayment);

// POST /api/payments/ratings                -> submit a rating and review
router.post('/ratings', paymentController.submitRating);
router.get('/ratings/mechanic/:id', paymentController.getMechanicRatings);

// GET  /api/payments/history                -> get payment history
router.get('/history', paymentController.getPaymentHistory);

// GET  /api/payments/customer-history       -> get customer service history
router.get('/customer-history', paymentController.getServiceHistoryCustomer);

// GET  /api/payments/mechanic-history       -> get mechanic service history
router.get('/mechanic-history', paymentController.getServiceHistoryMechanic);

// GET  /api/payments/:id/status             -> get payment status by id
router.get('/:id/status', paymentController.getPaymentStatus);

module.exports = router;
