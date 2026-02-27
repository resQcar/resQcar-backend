const admin = require("../config/firebase");
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // ✅ Validate
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ message: "Full name is required." });
    }

    // ✅ Create Firebase user
    const userRecord = await admin.auth().createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: String(fullName).trim(),
      // phoneNumber must be E.164 format like +94771234567
      phoneNumber: phone ? String(phone).trim() : undefined,
    });

    // ✅ (Optional) Save extra data in Firebase (Custom Claims)
    // You can set default userType = null here (selected later)
    // await admin.auth().setCustomUserClaims(userRecord.uid, { userType: null });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName,
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

