const { db } = require("../config/firebase");

async function getAvailableMechanics(req, res) {
  try {
    const snap = await db
      .collection("mechanics")
      .where("availability", "==", true)
      .get();

    const mechanics = [];
    snap.forEach((doc) => {
      mechanics.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ count: mechanics.length, mechanics });
  } catch (err) {
    console.error("getAvailableMechanics error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { getAvailableMechanics };