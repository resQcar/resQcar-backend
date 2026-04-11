const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/google", authLimiter, controller.googleAuth);
router.post("/send-otp", authLimiter, controller.sendOtp);
router.post("/verify-otp", authLimiter, controller.verifyOtp);
router.put("/select-user-type", requireAuth, controller.selectUserType);

module.exports = router;
