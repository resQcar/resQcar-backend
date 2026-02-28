const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/:id/status', paymentController.getPaymentStatus);
router.get('/history', paymentController.getPaymentHistory);
router.get('/service-history/customer', paymentController.getServiceHistoryCustomer);
router.get('/service-history/mechanic', paymentController.getServiceHistoryMechanic);

module.exports = router;