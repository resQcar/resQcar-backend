// src/middleware/upload.js
// Multer configuration for local file uploads

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Allow only common doc/image types
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeExtFromMimetype(mimetype, originalname) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (ext && ext.length <= 8) return ext;

  if (mimetype === "application/pdf") return ".pdf";
  if (mimetype === "image/jpeg") return ".jpg";
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/webp") return ".webp";
  return "";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uid = req.user?.uid || "anonymous";
    const docType = (file.fieldname || "document")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    const uploadDir = path.join(__dirname, "..", "..", "uploads", uid, docType);
    ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uid = req.user?.uid || "anonymous";
    const docType = (file.fieldname || "document")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    const ext = safeExtFromMimetype(file.mimetype, file.originalname);
    const ts = Date.now();
    const rand = Math.random().toString(16).slice(2, 10);
    cb(null, `${uid}_${docType}_${ts}_${rand}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, WEBP.`)
    );
  }
  cb(null, true);
}

// 10MB per file
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload };