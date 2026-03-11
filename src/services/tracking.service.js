// src/services/tracking.service.js
const realtimeDb = require('../config/realtimeDb');

// Save mechanic's live location to Realtime Database - POST /api/tracking/update-location
exports.updateLocation = async (mechanicId, latitude, longitude) => {
  const locationRef = realtimeDb.ref(`locations/${mechanicId}`);
  await locationRef.set({
    latitude,
    longitude,
    updatedAt: Date.now()
  });
};

// Get mechanic's live location from Realtime Database - GET /api/tracking/mechanic/:id
exports.getLocation = async (mechanicId) => {
  const locationRef = realtimeDb.ref(`locations/${mechanicId}`);
  const snapshot = await locationRef.once('value');
  return snapshot.val();
};
