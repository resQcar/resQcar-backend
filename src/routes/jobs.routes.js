// src/routes/jobs.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");

router.post("/offers/:offerId/accept", jobsController.acceptOffer);
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);
router.put("/:id/complete", requireAuth, jobsController.completeJob);
router.post("/:id/additional-work", requireAuth, jobsController.requestAdditionalWork);

// Shevon's routes
// PUT /api/jobs/:id/status (Update Job Status En Route)
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);

module.exports = router;
