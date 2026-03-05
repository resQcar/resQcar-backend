// src/routes/bookings.routes.js
const router = require('express').Router();
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

// POST /api/bookings/emergency       -> customer creates emergency booking
router.post('/emergency', createEmergencyBooking);

// GET  /api/bookings/:id             -> get single job details
router.get('/:id', getJobById);

// PUT  /api/bookings/:id/accept      -> mechanic accepts job
router.put('/:id/accept', acceptJob);

// PUT  /api/bookings/:id/reject      -> mechanic rejects job
router.put('/:id/reject', rejectJob);

// PUT  /api/bookings/:id/status      -> update job status (EN_ROUTE, ARRIVED, REPAIRING)
router.put('/:id/status', updateJobStatus);

// PUT  /api/bookings/:id/arrive      -> mechanic marks arrived at location
router.put('/:id/arrive', arriveAtJob);

// POST /api/bookings/:id/additional-work -> report additional issues
router.post('/:id/additional-work', addAdditionalWork);

// PUT  /api/bookings/:id/complete    -> mark job complete
router.put('/:id/complete', completeJob);

module.exports = router;
