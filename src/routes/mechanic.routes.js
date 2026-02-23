// src/routes/mechanic.routes.js
const express = require('express');
const router = express.Router();
const {
  getJobRequests,
  getActiveJobs,
  getDashboardStats,
} = require('../controllers/mechanics.controller');

// GET /api/mechanics/job-requests   → list all pending job requests for a mechanic
router.get('/job-requests', getJobRequests);

// GET /api/mechanics/active-jobs    → list mechanic's currently active jobs
router.get('/active-jobs', getActiveJobs);

// GET /api/mechanics/dashboard      → dashboard stats (earnings, rating, totals)
router.get('/dashboard', getDashboardStats);

module.exports = router;