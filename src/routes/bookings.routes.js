// src/routes/bookings.routes.js
const express = require('express');
const router = express.Router();
const {
  getJobById,
  acceptJob,
  rejectJob,
  updateJobStatus,
  addAdditionalWork,
  completeJob,
  arriveAtJob,
} = require('../controllers/bookings.controller');

// GET  /api/jobs/:id             → get single job details
router.get('/:id', getJobById);

// PUT  /api/jobs/:id/accept      → mechanic accepts a job request
router.put('/:id/accept', acceptJob);

// PUT  /api/jobs/:id/reject      → mechanic rejects a job request
router.put('/:id/reject', rejectJob);

// PUT  /api/jobs/:id/status      → update job status (en_route, arrived, repairing)
router.put('/:id/status', updateJobStatus);

// PUT  /api/jobs/:id/arrive      → mechanic marks arrived at location
router.put('/:id/arrive', arriveAtJob);

// POST /api/jobs/:id/additional-work → report additional issues found
router.post('/:id/additional-work', addAdditionalWork);

// PUT  /api/jobs/:id/complete    → mark job as completed
router.put('/:id/complete', completeJob);

module.exports = router;