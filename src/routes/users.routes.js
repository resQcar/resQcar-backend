// src/routes/users.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const usersController = require("../controllers/users.controller");

// GET /api/users/profile
router.get("/profile", requireAuth, usersController.getUserProfile);

// PUT /api/users/profile ✅ NEW
router.put("/profile", requireAuth, usersController.updateUserProfile);

module.exports = router;