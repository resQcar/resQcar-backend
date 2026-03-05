const path = require("path");
const { db } = require("../config/firebase");

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;

    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ user: doc.data() });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { name, phone, address } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    await db.collection("users").doc(uid).set(updates, { merge: true });

    const updated = await db.collection("users").doc(uid).get();
    return res.status(200).json({ message: "Profile updated", user: updated.data() });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/users/documents (multipart/form-data)
exports.uploadDocument = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { type } = req.body;

    if (!type) return res.status(400).json({ message: "Document type is required" });
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const relativePath = `/uploads/${path.basename(req.file.path)}`;

    const docRef = db.collection("users").doc(uid);
    const userSnap = await docRef.get();
    if (!userSnap.exists) return res.status(404).json({ message: "User not found" });

    const userData = userSnap.data();
    const documents = Array.isArray(userData.documents) ? userData.documents : [];

    const newDoc = {
      type,
      url: relativePath,
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    };

    documents.push(newDoc);

    await docRef.set({ documents }, { merge: true });

    return res.status(201).json({ message: "Document uploaded", document: newDoc });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/users/documents
exports.getDocuments = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ message: "User not found" });

    const data = snap.data();
    return res.status(200).json({ documents: data.documents || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};