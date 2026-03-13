const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');

const jobsController = require('../controllers/jobs.controller');
const bookingsController = require('../controllers/bookings.controller');

const upload = multer({ storage: multer.memoryStorage() });

// ⚠️  CRITICAL: Static/specific routes MUST come before /:id wildcard routes
// Otherwise Express matches "offers" as an :id and these routes never work

// 1. Specific named paths first
router.put('/offers/:offerId/accept', requireAuth, jobsController.acceptOffer);

// 2. Sub-resource routes (/:id/action) before plain /:id
router.put('/:id/accept',           requireAuth, bookingsController.acceptJob);
router.put('/:id/reject',           requireAuth, bookingsController.rejectJob);
router.put('/:id/arrive',           requireAuth, bookingsController.arriveAtJob);
router.put('/:id/status',           requireAuth, jobsController.updateJobStatus);
router.put('/:id/complete',         requireAuth, bookingsController.completeJob);
router.post('/:id/additional-work', requireAuth, bookingsController.addAdditionalWork);
router.post('/:id/photos',          requireAuth, upload.array('photos', 5), jobsController.uploadJobPhotos);

// 3. Plain /:id wildcard LAST — catches GET /api/jobs/:id
router.get('/:id', requireAuth, bookingsController.getJobById);

module.exports = router;