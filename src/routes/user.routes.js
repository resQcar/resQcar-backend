const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const controller = require("../controllers/user.controller");

router.get("/profile", authMiddleware, controller.getProfile);
router.put("/profile", authMiddleware, controller.updateProfile);

module.exports = router;