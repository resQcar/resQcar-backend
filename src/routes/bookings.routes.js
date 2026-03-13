// src/routes/bookings.routes.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  createEmergencyBooking,
  getJobById,
  acceptJob,
  rejectJob,
  updateJobStatus,
  addAdditionalWork,
  arriveAtJob,
  completeJob,
} = require('../controllers/bookings.controller');

// POST /api/bookings/emergency  -> customer creates emergency booking
router.post('/emergency', requireAuth, createEmergencyBooking);

// GET  /api/bookings/:id        -> get single job details
router.get('/:id', requireAuth, getJobById);

// PUT  /api/bookings/:id/accept -> mechanic accepts job
router.put('/:id/accept', requireAuth, acceptJob);

// PUT  /api/bookings/:id/reject -> mechanic rejects job
router.put('/:id/reject', requireAuth, rejectJob);

// PUT  /api/bookings/:id/status -> update job status
router.put('/:id/status', requireAuth, updateJobStatus);

// PUT  /api/bookings/:id/arrive -> mechanic marks arrived
router.put('/:id/arrive', requireAuth, arriveAtJob);

// POST /api/bookings/:id/additional-work -> report additional issues
router.post('/:id/additional-work', requireAuth, addAdditionalWork);

// PUT  /api/bookings/:id/complete -> mark job complete
router.put('/:id/complete', requireAuth, completeJob);

module.exports = router;
