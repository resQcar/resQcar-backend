const router = require("express").Router();
const {
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
  updateMechanicAvailability,
  updateMechanicProfile,
  getMechanicSpecializations,
} = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);
router.get("/nearby", getNearbyMechanics);
router.get("/:id/profile", getMechanicProfile);
router.get("/:id/specializations", getMechanicSpecializations); 

router.put("/availability", updateMechanicAvailability);
router.put("/profile", updateMechanicProfile);

module.exports = router;