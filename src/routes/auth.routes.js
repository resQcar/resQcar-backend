const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { register, login, selectUserType } = require("../controllers/auth.controller");

router.post("/register", register);

// Firebase login: send ID token in Authorization header
router.post("/login", auth, login);

router.put("/select-user-type", auth, selectUserType);

module.exports = router;