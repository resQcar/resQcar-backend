const router = require("express").Router();
const {
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
  updateMechanicAvailability, //  add
} = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);
router.get("/nearby", getNearbyMechanics);
router.get("/:id/profile", getMechanicProfile);

//  Update availability
router.put("/availability", updateMechanicAvailability);

module.exports = router;