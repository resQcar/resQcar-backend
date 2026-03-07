// src/routes/auth.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

// POST /api/auth/register
router.post("/register", controller.register);

// POST /api/auth/login
router.post("/login", controller.login);

// PUT /api/auth/select-user-type
router.put("/select-user-type", requireAuth, controller.selectUserType);
module.exports = router;
