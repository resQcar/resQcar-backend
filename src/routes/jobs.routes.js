// src/routes/jobs.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");
const multer = require('multer');

// Multer config - store in memory for upload
const upload = multer({ storage: multer.memoryStorage() });

// Imanjith's route
router.post("/offers/:offerId/accept", jobsController.acceptOffer);

// Shevon's routes
// PUT /api/jobs/:id/status - Update job status (en-route, arrived, in-progress, completed, cancelled)
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);

// PUT /api/jobs/:id/complete - Complete a job
router.put("/:id/complete", requireAuth, jobsController.completeJob);

// POST /api/jobs/:id/additional-work - Request additional work
router.post("/:id/additional-work", requireAuth, jobsController.requestAdditionalWork);

// POST /api/jobs/:id/photos - Upload job photos
router.post("/:id/photos", requireAuth, upload.array('photos', 5), jobsController.uploadJobPhotos);

module.exports = router;
