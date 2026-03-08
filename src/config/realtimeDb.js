const admin = require('firebase-admin');

// Reference to Firebase Realtime Database
// Used for live location tracking (real-time updates)
const realtimeDb = admin.database();

module.exports = realtimeDb;