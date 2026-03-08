const router = require("express").Router();
const { acceptOffer } = require("../controllers/jobs.controller");
const { requireAuth } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");

// Imanjith's route
router.post("/offers/:offerId/accept", acceptOffer);

// Shevon's routes
// PUT /api/jobs/:id/status (Update Job Status En Route)
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);

module.exports = router;