const router = require("express").Router();
const { getAvailableMechanics } = require("../controllers/mechanics.controller");

router.get("/available", getAvailableMechanics);

module.exports = router;