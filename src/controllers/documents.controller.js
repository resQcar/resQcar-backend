const multer = require("multer");
const { bucket, db, admin } = require("../config/firebaseAdmin");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

exports.uploadMiddleware = upload.single("document");

/**
 * POST /api/users/documents
 * headers: Authorization Bearer <idToken>
 * form-data: document=<file>, type=license|vehicle|other
 */
exports.uploadDocument = async (req, res) => {
  try {
    const uid = req.user.uid;

    if (!req.file) return res.status(400).json({ message: "No file uploaded. Use field name: document" });

    const docType = (req.body.type || "other").toString().trim();
    const safeType = ["license", "vehicle", "other"].includes(docType) ? docType : "other";

    const ext = (req.file.originalname.split(".").pop() || "bin").toLowerCase();
    const filePath = `users/${uid}/documents/${Date.now()}_${safeType}.${ext}`;

    const file = bucket.file(filePath);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: {
        metadata: {
          uid,
          type: safeType,
          originalName: req.file.originalname,
        },
      },
    });

    // Make a long-lived signed URL (or you can keep private & serve differently)
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2035-01-01",
    });

    const docRef = await db.collection("users").doc(uid).collection("documents").add({
      type: safeType,
      filePath,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: "Document uploaded.",
      document: { id: docRef.id, type: safeType, url, filePath },
    });
  } catch (e) {
    return res.status(500).json({ message: "Upload failed.", error: String(e?.message || e) });
  }
};

/**
 * GET /api/users/documents
 */
exports.getDocuments = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("documents")
      .orderBy("createdAt", "desc")
      .get();

    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ documents: docs });
  } catch (e) {
    return res.status(500).json({ message: "Failed to load documents.", error: String(e?.message || e) });
  }
};