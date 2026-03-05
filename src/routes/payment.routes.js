// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// POST /api/payments/create-intent          -> create a Stripe payment intent
router.post('/create-intent', paymentController.createPaymentIntent);

// POST /api/payments/confirm                -> confirm a Stripe payment
router.post('/confirm', paymentController.confirmPayment);

// GET  /api/payments/history                -> get payment history
router.get('/history', paymentController.getPaymentHistory);
router.get('/service-history/customer', paymentController.getServiceHistoryCustomer);
router.get('/service-history/mechanic', paymentController.getServiceHistoryMechanic);
router.post('/ratings', paymentController.submitRating);

// GET  /api/payments/customer-history       -> get customer service history
router.get('/customer-history', paymentController.getServiceHistoryCustomer);

// GET  /api/payments/mechanic-history       -> get mechanic service history
router.get('/mechanic-history', paymentController.getServiceHistoryMechanic);

// GET  /api/payments/:id/status             -> get payment status by id
router.get('/:id/status', paymentController.getPaymentStatus);

module.exports = router;
