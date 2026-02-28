// src/controllers/users.controller.js
const admin = require("../config/firebase");

// GET /api/users/profile
async function getUserProfile(req, res) {
  try {
    const uid = req.user?.uid; // comes from requireAuth middleware
    if (!uid) return res.status(401).json({ message: "Unauthorized." });

    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    return res.status(200).json({
      message: "User profile fetched successfully.",
      user: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        fullName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: userRecord.photoURL || null,

        // custom claim from select-user-type
        userType: claims.userType ?? req.user?.userType ?? null,

        // extra useful fields
        emailVerified: Boolean(userRecord.emailVerified),
        disabled: Boolean(userRecord.disabled),
        createdAt: userRecord.metadata?.creationTime || null,
        lastSignInAt: userRecord.metadata?.lastSignInTime || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch user profile.",
      error: String(err?.message || err),
    });
  }
}

module.exports = { getUserProfile };