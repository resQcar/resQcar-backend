// src/controllers/auth.controller.js
const { admin, auth, db } = require("../config/firebase");
const https = require("https");
const crypto = require("crypto");

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

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
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ message: "Full name is required." });
    }

    let userRecord;

    // ── Try to find the user Firebase already created on the client ──
    // (Flutter calls Firebase.createUserWithEmailAndPassword first,
    //  then calls this endpoint just to save the Firestore doc)
    try {
      userRecord = await auth.getUserByEmail(String(email).trim().toLowerCase());
    } catch (notFound) {
      // User doesn't exist in Firebase yet — create them (legacy flow)
      if (!password || String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }
      userRecord = await auth.createUser({
        email:       String(email).trim().toLowerCase(),
        password:    String(password),
        displayName: String(displayName).trim(),
        phoneNumber: phone ? String(phone).trim() : undefined,
      });
    }

    // Update display name if not already set
    if (!userRecord.displayName) {
      await auth.updateUser(userRecord.uid, {
        displayName: String(displayName).trim(),
      });
    }

    // Save / update Firestore doc
    await db.collection("users").doc(userRecord.uid).set({
      uid:         userRecord.uid,
      email:       userRecord.email,
      fullName:    String(displayName).trim(),
      phoneNumber: phone ? String(phone).trim() : (userRecord.phoneNumber || null),
      userType:    null,
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // merge:true so we don't overwrite existing fields

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        uid:         userRecord.uid,
        email:       userRecord.email,
        fullName:    String(displayName).trim(),
        phoneNumber: phone || userRecord.phoneNumber || null,
      },
    });
  } catch (err) {
    const code = err?.errorInfo?.code || err?.code;
    if (code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Email already registered." });
    }
    if (code === "auth/invalid-phone-number") {
      return res.status(400).json({ message: "Phone must be in E.164 format (e.g. +94771234567)." });
    }
    if (code === "auth/invalid-password") {
      return res.status(400).json({ message: "Password is invalid (min 6 chars)." });
    }
    return res.status(500).json({ message: "Registration failed." });
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

    // Fetch Firestore doc to get createdAt and any extra fields
    const userDoc = await db.collection("users").doc(uid).get();
    const firestoreData = userDoc.exists ? userDoc.data() : {};
    const createdAt = firestoreData.createdAt
      ? firestoreData.createdAt.toDate().toISOString()
      : null;

    return res.status(200).json({
      message: "Login successful.",
      token: tokenToVerify,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName || firestoreData.fullName || null,
        phoneNumber: userRecord.phoneNumber || firestoreData.phoneNumber || null,
        userType,
        createdAt,
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
    return res.status(500).json({ message: "Login failed." });
  }
};

// ---------- GOOGLE AUTH ----------
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google idToken is required.' });

    const decoded    = await auth.verifyIdToken(String(idToken));
    const uid        = decoded.uid;
    const userRecord = await auth.getUser(uid);

    const userRef  = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    let isNewUser  = false;

    if (!userSnap.exists) {
      isNewUser = true;
      await userRef.set({
        uid,
        email:       userRecord.email       || null,
        fullName:    userRecord.displayName || 'Google User',
        photoURL:    userRecord.photoURL    || null,
        phoneNumber: null,
        provider:    'google',
        userType:    null,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const freshSnap     = await userRef.get();
    const firestoreData = freshSnap.data() || {};
    const userType  = userRecord.customClaims?.userType ?? firestoreData.userType ?? null;
    const createdAt = firestoreData.createdAt
      ? firestoreData.createdAt.toDate().toISOString() : null;

    return res.status(200).json({
      message:  isNewUser ? 'Google account registered.' : 'Google login successful.',
      token:    idToken,
      isNewUser,
      user: {
        uid,
        email:       userRecord.email       || null,
        fullName:    userRecord.displayName || firestoreData.fullName || 'Google User',
        photoURL:    userRecord.photoURL    || firestoreData.photoURL || null,
        phoneNumber: userRecord.phoneNumber || firestoreData.phoneNumber || null,
        userType,
        createdAt,
      },
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes('Firebase ID token has expired')) {
      return res.status(401).json({ message: 'Google token expired. Please sign in again.' });
    }
    return res.status(500).json({ message: 'Google authentication failed.' });
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
    return res.status(500).json({ message: "Failed to update user type." });
  }
};
// ---------- SEND OTP ----------
// Sends a 6-digit OTP to the given phone number via Firebase Auth
// and stores it temporarily in Firestore with a 10-minute expiry.
exports.sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    // Must be E.164 format e.g. +94771234567
    phone = String(phone).trim();
    if (!phone.startsWith('+')) {
      return res.status(400).json({ message: 'Phone must include country code (e.g. +94771234567).' });
    }

    // Generate 6-digit OTP using cryptographically secure random
    const otp       = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save hashed OTP to Firestore — never store plaintext
    await db.collection('otp_verifications').doc(phone).set({
      otpHash:   hashOtp(otp),
      expiresAt,
      verified:  false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Send SMS via Twilio ──────────────────────────────
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      // Twilio not configured — fall back to terminal log (dev only)
      console.log(`[OTP] TWILIO not configured. Code for ${phone}: ${otp}`);
      return res.status(200).json({
        message: `OTP sent to ${phone}. Valid for 10 minutes.`,
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
      });
    }

    const twilio = require('twilio')(accountSid, authToken);

    await twilio.messages.create({
      body: `Your resQcar verification code is: ${otp}\n\nDo not share this code with anyone. Valid for 10 minutes.`,
      from: fromNumber,
      to:   phone,
    });

    console.log(`[OTP] SMS sent to ${phone}`);

    return res.status(200).json({
      message: `OTP sent to ${phone}. Valid for 10 minutes.`,
    });

  } catch (err) {
    console.error('sendOtp error:', err.message);

    // Give a helpful error if it's a Twilio issue
    if (err.code === 21608) {
      return res.status(400).json({ message: 'This number is not verified in your Twilio trial account. Verify it at twilio.com/console first.' });
    }
    if (err.code === 21211) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }
    if (err.code === 20003) {
      return res.status(500).json({ message: 'Twilio credentials are incorrect. Check your .env file.' });
    }

    return res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

// ---------- VERIFY OTP ----------
// Checks the OTP the user typed against what's stored in Firestore.
exports.verifyOtp = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required.' });

    phone = String(phone).trim();
    otp   = String(otp).trim();

    const docRef  = db.collection('otp_verifications').doc(phone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'No OTP found for this number. Please request a new one.' });
    }

    const data = docSnap.data();

    // Check expiry
    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return res.status(410).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check OTP match — compare hashes
    if (data.otpHash !== hashOtp(otp)) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    // Delete OTP record — no longer needed after successful verification
    await docRef.delete();

    return res.status(200).json({
      message: 'Phone number verified successfully.',
      verified: true,
      phone,
    });
  } catch (err) {
    console.error('verifyOtp error:', err.message);
    return res.status(500).json({ message: 'OTP verification failed.' });
  }
};
