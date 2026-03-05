// src/controllers/auth.controller.js
const { admin, auth, db } = require("../config/firebase");
const https = require("https");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function firebaseEmailPasswordLogin(email, password) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return reject(new Error("Missing FIREBASE_WEB_API_KEY in .env"));
    }

    const postData = JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      returnSecureToken: true,
    });

    const options = {
      hostname: "identitytoolkit.googleapis.com",
      path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data || "{}");
          if (json?.error?.message) return reject(new Error(json.error.message));
          return resolve(json);
        } catch {
          return reject(new Error("Invalid response from Firebase Auth REST API"));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// ---------- REGISTER ----------
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, name, phone } = req.body;
    const displayName = fullName || name;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const userRecord = await auth.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: String(displayName).trim(),
      phoneNumber: phone ? String(phone).trim() : undefined,
    });

    // Save user to Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      fullName: String(displayName).trim(),
      userType: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
      },
    });
  } catch (err) {
    const code = err?.errorInfo?.code || err?.code;
    if (code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Email already registered." });
    }
    if (code === "auth/invalid-phone-number") {
      return res.status(400).json({ message: "Phone must be in E.164 format (ex: +94771234567)." });
    }
    if (code === "auth/invalid-password") {
      return res.status(400).json({ message: "Password is invalid (min 6 chars)." });
    }
    return res.status(500).json({
      message: "Registration failed.",
      error: String(err?.message || err),
    });
  }
};

// ---------- LOGIN ----------
exports.login = async (req, res) => {
  try {
    const { idToken, email, password } = req.body;
    let tokenToVerify = idToken;

    if (!tokenToVerify) {
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      if (!password || String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }
      const loginRes = await firebaseEmailPasswordLogin(email, password);
      tokenToVerify = loginRes.idToken;
    }

    const decoded = await auth.verifyIdToken(String(tokenToVerify));
    const uid = decoded.uid;
    const userRecord = await auth.getUser(uid);
    const userType = decoded.userType ?? userRecord.customClaims?.userType ?? null;

    return res.status(200).json({
      message: "Login successful.",
      token: tokenToVerify,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        userType,
      },
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("INVALID_PASSWORD") || msg.includes("EMAIL_NOT_FOUND")) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (msg.includes("USER_DISABLED")) {
      return res.status(403).json({ message: "User account is disabled." });
    }
    return res.status(500).json({ message: "Login failed.", error: msg });
  }
};

// ---------- SELECT USER TYPE ----------
exports.selectUserType = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ message: "Unauthorized." });

    let { userType } = req.body;
    if (!userType) {
      return res.status(400).json({ message: "userType is required (customer/mechanic)." });
    }

    userType = String(userType).trim().toLowerCase();
    const allowed = ["customer", "mechanic"];
    if (!allowed.includes(userType)) {
      return res.status(400).json({ message: "Invalid userType. Use 'customer' or 'mechanic'." });
    }

    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};

    // Update Firebase Auth custom claims
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      userType,
    });

    // Update Firestore too
    await db.collection("users").doc(uid).update({ userType });

    return res.status(200).json({
      message: "User type updated successfully.",
      user: {
        uid,
        email: userRecord.email,
        fullName: userRecord.displayName || null,
        userType,
      },
      note: "Login again to get a new token containing updated userType claim.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update user type.",
      error: String(err?.message || err),
    });
  }
};
