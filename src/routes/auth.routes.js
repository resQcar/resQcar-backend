const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.put("/select-user-type", authMiddleware, controller.selectUserType);

module.exports = router;