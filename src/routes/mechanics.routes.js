const router = require("express").Router();

const {
  getAvailableMechanics,
  getNearbyMechanics,
} = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);
router.get("/nearby", getNearbyMechanics);

module.exports = router;