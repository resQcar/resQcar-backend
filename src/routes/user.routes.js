// src/routes/user.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  getProfile,
  updateProfile,
  uploadDocument,
  getDocuments,
} = require("../controllers/user.controller");

// GET /api/users/profile
router.get("/profile", auth, getProfile);

// PUT /api/users/profile
router.put("/profile", auth, updateProfile);

// POST /api/users/documents
router.post("/documents", auth, upload.single("file"), uploadDocument);

// GET /api/users/documents
router.get("/documents", auth, getDocuments);

module.exports = router;
