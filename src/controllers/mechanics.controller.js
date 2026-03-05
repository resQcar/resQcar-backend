// src/controllers/mechanics.controller.js
const { db } = require('../config/firebase');


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
    const snapshot = await db
      .collection('mechanics')
      .where('isAvailable', '==', true)
      .where('isOnline', '==', true)
      .get();

    const mechanics = [];
    snapshot.forEach((doc) => {
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
};


// GET Nearby Mechanics

async function getNearbyMechanics(req, res) {
  try {
    const { lat, lng, radiusKm = '10' } = req.query;
    const radius = parseFloat(radiusKm);

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required as query params' });
    }

    const userLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    const snapshot = await db
      .collection('mechanics')
      .where('isAvailable', '==', true)
      .where('isOnline', '==', true)
      .get();

    const nearby = [];
    snapshot.forEach((doc) => {
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

    return res.status(200).json({ success: true, count: nearby.length, mechanics: nearby });
  } catch (error) {
    console.error('getNearbyMechanics error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/mechanics/:id/profile
const getMechanicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('mechanics').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    const mechanic = { id: doc.id, ...doc.data() };

    const profile = {
      id: mechanic.id,
      name: mechanic.name || '',
      phone: mechanic.phone || '',
      isAvailable: !!mechanic.isAvailable,
      isOnline: !!mechanic.isOnline,
      location: mechanic.location || null,
      specializations: mechanic.specializations || [],
      ratingAvg: mechanic.ratingAvg || 0,
      ratingCount: mechanic.ratingCount || 0,
    };

    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error('getMechanicProfile error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getJobRequests,
  getActiveJobs,
  getDashboardStats,
  getAvailableMechanics,
  getNearbyMechanics,
  getMechanicProfile,
};
