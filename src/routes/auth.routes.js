const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", authController.register);

// POST /api/auth/login
router.post("/login", authController.login);

// PUT /api/auth/select-user-type
router.put("/select-user-type", requireAuth, authController.selectUserType);

module.exports = router;