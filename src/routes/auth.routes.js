const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.put("/select-user-type", requireAuth, controller.selectUserType);

// PUT /api/auth/select-user-type
router.put("/select-user-type", requireAuth, controller.selectUserType);
module.exports = router;
