const router = require("express").Router();
const {
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile, //  add this
} = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);
router.get("/nearby", getNearbyMechanics);
router.get("/:id/profile", getMechanicProfile); //  add this

module.exports = router;