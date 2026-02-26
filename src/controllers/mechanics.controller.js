const { db } = require("../config/firebase");

// Haversine helpers
function toRad(x) {
  return (x * Math.PI) / 180;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

// ✅ GET Available Mechanics
async function getAvailableMechanics(req, res) {
  try {
    const snap = await db
      .collection("mechanics")
      .where("isAvailable", "==", true)
      .where("isOnline", "==", true)
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

// ✅ GET Nearby Mechanics
async function getNearbyMechanics(req, res) {
  try {
    const { lat, lng, radiusKm = "10" } = req.query;
    const radius = parseFloat(radiusKm);

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const userLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    const snap = await db
      .collection("mechanics")
      .where("isAvailable", "==", true)
      .where("isOnline", "==", true)
      .get();

    const nearby = [];

    snap.forEach((doc) => {
      const mechanic = doc.data();

      if (mechanic.location?.lat != null && mechanic.location?.lng != null) {
        const dist = distanceKm(userLocation, mechanic.location);

        if (dist <= radius) {
          nearby.push({
            id: doc.id,
            distanceKm: dist,
            ...mechanic,
          });
        }
      }
    });

    nearby.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      count: nearby.length,
      mechanics: nearby,
    });
  } catch (err) {
    console.error("Nearby error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ✅ EXPORTS (this is required!)
module.exports = {
  getAvailableMechanics,
  getNearbyMechanics,
};