// src/routes/mechanic.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getJobRequests,
  getActiveJobs,
  getDashboardStats,
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
  getMyProfile,
  getMechanicSpecializations,
  updateMechanicAvailability,
  updateMechanicProfile,
} = require('../controllers/mechanics.controller');

// Public-ish reads (still require auth)
router.get('/available', requireAuth, getAvailableMechanics);
router.get('/nearby', requireAuth, getNearbyMechanics);

// Mechanic-specific
router.get('/job-requests', requireAuth, getJobRequests);
router.get('/active-jobs', requireAuth, getActiveJobs);
router.get('/dashboard', requireAuth, getDashboardStats);
router.put('/availability', requireAuth, updateMechanicAvailability);
router.get('/profile', requireAuth, getMyProfile);           // ← own profile
router.put('/profile', requireAuth, updateMechanicProfile);

// Must be after named routes
router.get('/:id/profile', requireAuth, getMechanicProfile);
router.get('/:id/specializations', requireAuth, getMechanicSpecializations);

module.exports = router;