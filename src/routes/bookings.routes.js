// src/routes/bookings.routes.js
const router = require('express').Router();
const {
  createEmergencyBooking,
  getJobById,
  acceptJob,
  rejectJob,
  updateJobStatus,
  addAdditionalWork,
  completeJob,
  arriveAtJob,
} = require('../controllers/bookings.controller');

// POST /api/bookings/emergency  → customer creates emergency booking
router.post('/emergency', createEmergencyBooking);

// GET  /api/bookings/:id        → get single job details
router.get('/:id', getJobById);

// PUT  /api/bookings/:id/accept → mechanic accepts job
router.put('/:id/accept', acceptJob);

// PUT  /api/bookings/:id/reject → mechanic rejects job
router.put('/:id/reject', rejectJob);

// PUT  /api/bookings/:id/status → update job status
router.put('/:id/status', updateJobStatus);

// PUT  /api/jobs/:id/arrive      → mechanic marks arrived at location
router.put('/:id/arrive', arriveAtJob);

// POST /api/jobs/:id/additional-work → report additional issues found
router.post('/:id/additional-work', addAdditionalWork);

// PUT  /api/bookings/:id/complete → mark job complete
router.put('/:id/complete', completeJob);

module.exports = router;
