const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/google", controller.googleAuth);
router.put("/select-user-type", requireAuth, controller.selectUserType);

module.exports = router;