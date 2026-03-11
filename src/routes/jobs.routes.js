const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const jobsController = require("../controllers/jobs.controller");
const multer = require('multer');

// Multer config - store in memory for Firebase upload
const upload = multer({ storage: multer.memoryStorage() });

router.post("/offers/:offerId/accept", jobsController.acceptOffer);
router.put("/:id/status", requireAuth, jobsController.updateJobStatus);
router.put("/:id/complete", requireAuth, jobsController.completeJob);
router.post("/:id/additional-work", requireAuth, jobsController.requestAdditionalWork);
router.post("/:id/photos", requireAuth, upload.array('photos', 5), jobsController.uploadJobPhotos);

module.exports = router;