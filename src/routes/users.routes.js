// src/routes/users.routes.js
const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const usersController = require("../controllers/users.controller");

// =====================
// Profile
// =====================
router.get("/profile", requireAuth, usersController.getUserProfile);
router.put("/profile", requireAuth, usersController.updateUserProfile);

// =====================
// Documents
// =====================

// POST /api/users/documents
router.post(
  "/documents",
  requireAuth,
  upload.fields([
    { name: "vehicleDocs", maxCount: 10 },
    { name: "license", maxCount: 2 },
  ]),
  usersController.uploadUserDocuments
);

// GET /api/users/documents
router.get("/documents", requireAuth, usersController.getUserDocuments);

module.exports = router;