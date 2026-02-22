const { admin, db } = require("../config/firebase");

/**
 * Firestore structure:
 * users (collection)
 *   - {uid} (doc)
 *       name, email, userType, phone, address, documents[], createdAt
 */

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name = "", email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create Firestore user profile
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      userType: null,
      phone: "",
      address: "",
      documents: [],
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "User registered successfully",
      uid: userRecord.uid,
    });
  } catch (err) {
    // Common: email already exists
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/login
 * Firebase-style: backend does NOT validate password.
 * Flutter logs in using Firebase Auth SDK, then sends ID token here.
 */
exports.login = async (req, res) => {
  try {
    // auth middleware already verified token and set req.user
    const uid = req.user.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      // If user exists in Firebase Auth but missing profile, create it
      const fbUser = await admin.auth().getUser(uid);

      await db.collection("users").doc(uid).set({
        name: fbUser.displayName || "",
        email: fbUser.email || "",
        userType: null,
        phone: "",
        address: "",
        documents: [],
        createdAt: new Date().toISOString(),
      });

      const created = await db.collection("users").doc(uid).get();
      return res.status(200).json({ message: "Login ok", user: created.data() });
    }

    return res.status(200).json({ message: "Login ok", user: userDoc.data() });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/select-user-type
exports.selectUserType = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!["customer", "mechanic"].includes(userType)) {
      return res.status(400).json({ message: "userType must be 'customer' or 'mechanic'" });
    }

    const uid = req.user.uid;

    await db.collection("users").doc(uid).set(
      { userType },
      { merge: true }
    );

    return res.status(200).json({ message: "User type updated", userType });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};