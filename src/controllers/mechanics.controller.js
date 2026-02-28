const { db } = require("../config/firebase");


// Haversine helpers

function toRad(x) {
  return (x * Math.PI) / 180;
}

function distanceKm(a, b) {
  const R = 6371; // Earth radius in KM
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

// GET Available Mechanics

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

    return res.json({
      count: mechanics.length,
      mechanics,
    });
  } catch (err) {
    console.error("getAvailableMechanics error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


// GET Nearby Mechanics

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

      if (
        mechanic.location?.lat != null &&
        mechanic.location?.lng != null
      ) {
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

    // Sort by nearest first
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


// GET Mechanic Profile

async function getMechanicProfile(req, res) {
  try {
    const { id } = req.params;

    const doc = await db.collection("mechanics").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Mechanic not found" });
    }

    const mechanic = { id: doc.id, ...doc.data() };

    // Clean response (only needed fields)
    const profile = {
      id: mechanic.id,
      name: mechanic.name || "",
      phone: mechanic.phone || "",
      isAvailable: !!mechanic.isAvailable,
      isOnline: !!mechanic.isOnline,
      location: mechanic.location || null,
      specializations: mechanic.specializations || [],
      ratingAvg: mechanic.ratingAvg || 0,
      ratingCount: mechanic.ratingCount || 0,
    };

    return res.json({ profile });
  } catch (err) {
    console.error("getMechanicProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function updateMechanicAvailability(req, res) {
  try {
    const { mechanicId, isAvailable, isOnline } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: "mechanicId is required" });
    }

    // at least one field must be provided
    const hasIsAvailable = typeof isAvailable === "boolean";
    const hasIsOnline = typeof isOnline === "boolean";

    if (!hasIsAvailable && !hasIsOnline) {
      return res.status(400).json({
        error: "Provide isAvailable and/or isOnline as boolean",
      });
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (hasIsAvailable) updateData.isAvailable = isAvailable;
    if (hasIsOnline) updateData.isOnline = isOnline;

    await db.collection("mechanics").doc(mechanicId).set(updateData, { merge: true });

    return res.json({ ok: true, mechanicId, ...updateData });
  } catch (err) {
    console.error("updateMechanicAvailability error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// mechanic specializations
async function getMechanicSpecializations(req, res) {
  try {
    const { id } = req.params;

    const doc = await db.collection("mechanics").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Mechanic not found" });
    }

    const mechanic = doc.data();

    return res.json({
      mechanicId: id,
      specializations: mechanic.specializations || [],
    });

  } catch (err) {
    console.error("getMechanicSpecializations error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
async function updateMechanicProfile(req, res) {
  try {
    const { mechanicId, name, phone, location, specializations } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: "mechanicId is required" });
    }

    const updateData = { updatedAt: new Date().toISOString() };

    if (typeof name === "string") updateData.name = name;
    if (typeof phone === "string") updateData.phone = phone;

    if (
      location &&
      typeof location.lat === "number" &&
      typeof location.lng === "number"
    ) {
      updateData.location = {
        lat: location.lat,
        lng: location.lng,
      };
    }

    if (Array.isArray(specializations)) {
      updateData.specializations = specializations;
    }

    await db.collection("mechanics").doc(mechanicId).set(updateData, { merge: true });

    return res.json({ ok: true, mechanicId, ...updateData });

  } catch (err) {
    console.error("updateMechanicProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
// EXPORTS

module.exports = {
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
  updateMechanicAvailability,
  getMechanicSpecializations,
  updateMechanicProfile, 
};