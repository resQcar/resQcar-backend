// src/routes/bookings.routes.js
const router = require("express").Router();
const { createEmergencyBooking } = require("../controllers/bookings.controller");

router.post("/emergency", createEmergencyBooking);

module.exports = router;