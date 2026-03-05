const router = require("express").Router();
const { acceptOffer } = require("../controllers/jobs.controller");

router.post("/offers/:offerId/accept", acceptOffer);

module.exports = router;