const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

// General limiter for registration, OTP, and Google auth (10 per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

// Stricter limiter for login — 5 attempts per 15 min to reduce brute-force risk
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

router.post("/register", authLimiter, controller.register);
router.post("/login", loginLimiter, controller.login);
router.post("/google", authLimiter, controller.googleAuth);
router.post("/send-otp", authLimiter, controller.sendOtp);
router.post("/verify-otp", authLimiter, controller.verifyOtp);
router.put("/select-user-type", requireAuth, controller.selectUserType);

module.exports = router;
