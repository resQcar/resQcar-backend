const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");

// Imanjith's route
router.post("/offers/:offerId/accept", jobsController.acceptOffer);

// Shevon's routes
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);
router.put("/:id/complete", requireAuth, jobsController.completeJob);

module.exports = router;