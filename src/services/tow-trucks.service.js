// src/services/tow-trucks.service.js
// =====================================================
// Service Layer - All Firebase Database Operations
// =====================================================
// Think of this as the "warehouse worker" - it handles
// all reading and writing to the database.
// The controller asks this file to do the database work.

const { db, admin } = require('../config/firebase');

// ─────────────────────────────────────────────────────────
// HELPER: Calculate distance between two GPS coordinates
// Uses the "Haversine formula" - a math formula for distances on a sphere (Earth)
// Returns distance in kilometers
// ─────────────────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// ─────────────────────────────────────────────────────────
// 1. CREATE a new tow truck request in the database
// ─────────────────────────────────────────────────────────
exports.createTowRequest = async (requestData) => {
  // Create a new empty document with auto-generated ID
  const requestRef = db.collection('towRequests').doc();

  const newRequest = {
    id: requestRef.id,
    customerId: requestData.customerId,
    customerName: requestData.customerName || 'Unknown',
    customerPhone: requestData.customerPhone || null,
    pickupLocation: requestData.pickupLocation,
    dropoffLocation: requestData.dropoffLocation,
    vehicleDetails: requestData.vehicleDetails || {},
    towTruckType: requestData.towTruckType,
    status: 'pending', // Always starts as pending
    assignedTowTruckId: null, // No truck assigned yet
    estimatedPrice: null, // Will be calculated later
    requestedAt: admin.firestore.FieldValue.serverTimestamp(), // Current timestamp
    acceptedAt: null,
    completedAt: null,
  };

  // Save to Firebase
  await requestRef.set(newRequest);

  // Return the data with a readable date (serverTimestamp isn't readable directly)
  return { ...newRequest, requestedAt: new Date().toISOString() };
};

// ─────────────────────────────────────────────────────────
// 2. GET available tow trucks (with optional type filter)
// ─────────────────────────────────────────────────────────
exports.getAvailableTowTrucks = async ({ latitude, longitude, type, radius }) => {
  // Start building our database query
  let query = db.collection('towTrucks').where('isAvailable', '==', true);

  // If a specific type was requested, filter by it
  // e.g., type = "flatbed" → only show flatbed trucks
  if (type) {
    query = query.where('type', '==', type);
  }

  // Execute the query and get results
  const snapshot = await query.get();

  // If no trucks found, return empty array
  if (snapshot.empty) {
    return [];
  }

  // Process each truck: calculate distance and filter by radius
  const towTrucks = [];

  snapshot.forEach((doc) => {
    const truck = { id: doc.id, ...doc.data() };

    // Calculate how far this truck is from the customer
    const distance = calculateDistance(
      latitude,
      longitude,
      truck.location.latitude,
      truck.location.longitude
    );

    // Only include trucks within the requested radius (default: 10km)
    if (distance <= radius) {
      towTrucks.push({
        ...truck,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal (e.g., 2.3 km)
        estimatedArrival: `${Math.ceil((distance / 40) * 60)} mins`, // Assuming 40km/h speed
      });
    }
  });

  // Sort trucks by distance: closest truck appears first
  return towTrucks.sort((a, b) => a.distance - b.distance);
};

// ─────────────────────────────────────────────────────────
// 3. GET a single tow truck by its ID
// ─────────────────────────────────────────────────────────
exports.getTowTruckById = async (towTruckId) => {
  const doc = await db.collection('towTrucks').doc(towTruckId).get();

  // If truck doesn't exist, return null
  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
};

// ─────────────────────────────────────────────────────────
// 4. ACCEPT a tow request (tow truck driver accepts job)
// ─────────────────────────────────────────────────────────
exports.acceptTowRequest = async (requestId, towTruckId) => {
  // Get the request from database
  const requestRef = db.collection('towRequests').doc(requestId);
  const requestDoc = await requestRef.get();

  // Check if request exists
  if (!requestDoc.exists) {
    throw new Error('Tow request not found');
  }

  // Check if request is still pending (not already accepted by someone else)
  if (requestDoc.data().status !== 'pending') {
    throw new Error('This request has already been accepted or is no longer available');
  }

  // Use a "batch" to update two things at the same time:
  // 1. Update the request status to "accepted"
  // 2. Mark the tow truck as unavailable
  const batch = db.batch();

  // Update the tow request
  batch.update(requestRef, {
    status: 'accepted',
    assignedTowTruckId: towTruckId,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Mark the tow truck as busy (unavailable)
  const towTruckRef = db.collection('towTrucks').doc(towTruckId);
  batch.update(towTruckRef, {
    isAvailable: false,
  });

  // Execute both updates together
  await batch.commit();

  // Return the updated request
  const updatedDoc = await requestRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
};
