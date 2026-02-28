// src/controllers/users.controller.js
const admin = require("../config/firebase");

// helpers
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isValidE164(phone) {
  // safer min: 10 digits (Firebase/libphonenumber can reject too-short)
  return typeof phone === "string" && /^\+\d{10,15}$/.test(phone);
}
function isValidUrl(url) {
  if (typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// GET /api/users/profile
async function getUserProfile(req, res) {
  try {
    const uid = req.user?.uid;
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
        userType: claims.userType ?? req.user?.userType ?? null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch user profile.",
      error: err?.message || String(err),
    });
  }
}

// PUT /api/users/profile
async function updateUserProfile(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: "Unauthorized." });

    const { fullName, phoneNumber, photoURL } = req.body || {};

    const updateData = {};

    // fullName -> displayName
    if (fullName !== undefined) {
      if (fullName === "" || fullName === null) updateData.displayName = null;
      else if (!isNonEmptyString(fullName) || fullName.trim().length < 2) {
        return res.status(400).json({ message: "fullName must be 2+ characters." });
      } else updateData.displayName = fullName.trim();
    }

    // phoneNumber must be E.164
    // Sri Lanka example: 0771234567 => +94771234567 (remove leading 0)
    if (phoneNumber !== undefined) {
      if (phoneNumber === "" || phoneNumber === null) updateData.phoneNumber = null;
      else if (!isValidE164(phoneNumber)) {
        return res.status(400).json({
          message: "phoneNumber must be E.164 like +94771234567 (no spaces).",
        });
      } else updateData.phoneNumber = phoneNumber;
    }

    // photoURL must be a valid URL
    if (photoURL !== undefined) {
      if (photoURL === "" || photoURL === null) updateData.photoURL = null;
      else if (!isValidUrl(photoURL)) {
        return res.status(400).json({ message: "photoURL must be a valid URL." });
      } else updateData.photoURL = photoURL;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Send at least one field: fullName, phoneNumber, photoURL",
      });
    }

    await admin.auth().updateUser(uid, updateData);

    const userRecord = await admin.auth().getUser(uid);
    return res.status(200).json({
      message: "User profile updated successfully.",
      user: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        fullName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: userRecord.photoURL || null,
      },
    });
  } catch (err) {
    // return real firebase error details (super important for debugging)
    return res.status(500).json({
      message: "Failed to update user profile.",
      error: err?.message || String(err),
      code: err?.code || null,
    });
  }
}

module.exports = { getUserProfile, updateUserProfile };