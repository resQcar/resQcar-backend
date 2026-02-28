const router = require("express").Router();
const {
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
  updateMechanicAvailability,
  updateMechanicProfile, 
} = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);
router.get("/nearby", getNearbyMechanics);
router.get("/:id/profile", getMechanicProfile);

router.put("/availability", updateMechanicAvailability);

//  Profile settings
router.put("/profile", updateMechanicProfile);

module.exports = router;