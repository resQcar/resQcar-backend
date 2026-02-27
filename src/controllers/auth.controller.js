const { auth, db, admin } = require("../config/firebase");
// ---------------- REGISTER ----------------
exports.register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields required." });
    }

    const user = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      fullName,
      userType: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: "User registered successfully",
      uid: user.uid,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.error.message });
    }

    res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      uid: data.localId,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ---------------- SELECT USER TYPE ----------------
exports.selectUserType = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { userType } = req.body;

    if (!["customer", "mechanic"].includes(userType)) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    await db.collection("users").doc(uid).update({
      userType,
    });

    res.json({ message: "User type updated" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};