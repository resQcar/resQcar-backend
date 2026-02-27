const { db } = require("../config/firebase");

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;

    const doc = await db.collection("users").doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(doc.data());

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { fullName } = req.body;

    await db.collection("users").doc(uid).update({
      fullName,
    });

    res.json({ message: "Profile updated" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};