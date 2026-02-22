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

router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

router.post("/documents", auth, upload.single("file"), uploadDocument);
router.get("/documents", auth, getDocuments);

module.exports = router;