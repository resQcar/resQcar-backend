// src/services/tracking.service.js
// =====================================================
// Live Location Tracking via Firebase Realtime Database
// =====================================================
// Uses Firebase Realtime DB (not Firestore) for low-latency
// real-time location updates

const { admin } = require('../config/firebase');

// Get Realtime DB reference (only if databaseURL is configured)
function getRealtimeDb() {
  try {
    return admin.database();
  } catch (e) {
    console.error('[Tracking] Realtime DB not available:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Update mechanic's live location in Realtime DB
// Path: /locations/{mechanicId}
// ─────────────────────────────────────────────────────────
exports.updateLocation = async (mechanicId, latitude, longitude) => {
  const realtimeDb = getRealtimeDb();
  if (!realtimeDb) throw new Error('Realtime Database not configured');

  const locationData = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    updatedAt: Date.now(),
  };

  await realtimeDb.ref(`locations/${mechanicId}`).set(locationData);
  return locationData;
};

// ─────────────────────────────────────────────────────────
// Get mechanic's last known location from Realtime DB
// ─────────────────────────────────────────────────────────
exports.getLocation = async (mechanicId) => {
  const realtimeDb = getRealtimeDb();
  if (!realtimeDb) throw new Error('Realtime Database not configured');

  const snapshot = await realtimeDb.ref(`locations/${mechanicId}`).once('value');

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
};
