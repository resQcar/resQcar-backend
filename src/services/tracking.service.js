const realtimeDb = require('../config/realtimeDb');

// Save mechanic's live location to Realtime Database
exports.updateLocation = async (mechanicId, latitude, longitude) => {
  const locationRef = realtimeDb.ref(`locations/${mechanicId}`);
  await locationRef.set({
    latitude,
    longitude,
    updatedAt: Date.now()
  });
};