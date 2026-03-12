const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const jobsController = require('../controllers/jobs.controller');
const bookingsController = require('../controllers/bookings.controller');

// Workload-required routes under /api/jobs
router.put('/:id/accept', requireAuth, bookingsController.acceptJob);
router.put('/:id/reject', requireAuth, bookingsController.rejectJob);
router.put('/:id/arrive', requireAuth, bookingsController.arriveAtJob);
router.get('/:id', requireAuth, bookingsController.getJobById);

// Existing job routes
router.put('/:id/status', requireAuth, jobsController.updateJobStatus);
router.put('/:id/complete', requireAuth, bookingsController.completeJob);
router.post('/:id/additional-work', requireAuth, bookingsController.addAdditionalWork);
router.post('/:id/photos', requireAuth, jobsController.uploadJobPhotos);

// Optional offer route
router.put('/offers/:offerId/accept', requireAuth, jobsController.acceptOffer);

module.exports = router;