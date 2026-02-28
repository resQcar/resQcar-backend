const admin = require("../config/firebase");
const https = require("https");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// ---------- helper: sign in using Firebase REST API (email/password) ----------
function firebaseEmailPasswordLogin(email, password) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      return reject(
        new Error("Missing FIREBASE_WEB_API_KEY in .env (needed for email/password login via Postman).")
      );
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
async function register(req, res) {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ message: "Full name is required." });
    }

    const userRecord = await admin.auth().createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: String(fullName).trim(),
      phoneNumber: phone ? String(phone).trim() : undefined,
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
}

// ---------- LOGIN ----------
async function login(req, res) {
  try {
    const { idToken, email, password } = req.body;

    let tokenToVerify = idToken;

    // Option B: email+password (Postman)
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

    const decoded = await admin.auth().verifyIdToken(String(tokenToVerify));
    const uid = decoded.uid;

    const userRecord = await admin.auth().getUser(uid);
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

    return res.status(500).json({
      message: "Login failed.",
      error: msg,
    });
  }
}

module.exports = {
  register,
  login,
};

// ---------- SELECT USER TYPE ----------
async function selectUserType(req, res) {
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

    // keep existing claims and update userType
    const userRecord = await admin.auth().getUser(uid);
    const existingClaims = userRecord.customClaims || {};

    await admin.auth().setCustomUserClaims(uid, {
      ...existingClaims,
      userType,
    });

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
}
module.exports = {
  register,
  login,
  selectUserType,
};