// src/services/tow-trucks.service.js
// =====================================================
// Service Layer - All Firebase operations for Tow Trucks
// =====================================================

const { db, admin } = require('../config/firebase');

// ─────────────────────────────────────────────────────────
// Helper: Haversine formula to calculate distance between
// two GPS coordinates in kilometers
// ─────────────────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────────────────────
// Create a new tow truck request in Firestore
// ─────────────────────────────────────────────────────────
exports.createTowRequest = async (requestData) => {
  const requestRef = db.collection('towRequests').doc();

  const newRequest = {
    id: requestRef.id,
    customerId: requestData.customerId,
    customerPhone: requestData.customerPhone || null,
    pickupLocation: requestData.pickupLocation,
    dropoffLocation: requestData.dropoffLocation,
    vehicleDetails: requestData.vehicleDetails || null,
    towTruckType: requestData.towTruckType,
    status: 'pending', // pending | accepted | in-progress | completed | cancelled
    assignedTowTruckId: null,
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedAt: null,
    completedAt: null,
  };

  await requestRef.set(newRequest);

  // Return with a readable timestamp since serverTimestamp() is write-only
  return { ...newRequest, requestedAt: new Date().toISOString() };
};

// ─────────────────────────────────────────────────────────
// Get all available tow trucks filtered by location & type
// ─────────────────────────────────────────────────────────
exports.getAvailableTowTrucks = async ({ latitude, longitude, type, radius }) => {
  // Start query: only available trucks
  let query = db.collection('towTrucks').where('isAvailable', '==', true);

  // Add type filter if provided (flatbed / hook-chain / wheel-lift)
  if (type) {
    query = query.where('type', '==', type);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return [];
  }

  // Filter by distance using Haversine formula (Firestore can't do geo-queries natively)
  const towTrucks = [];
  snapshot.forEach((doc) => {
    const truck = { id: doc.id, ...doc.data() };

    // Make sure the truck has valid location data
    if (truck.location?.latitude == null || truck.location?.longitude == null) return;

    const distance = calculateDistance(
      latitude,
      longitude,
      truck.location.latitude,
      truck.location.longitude
    );

    // Only include trucks within the search radius
    if (distance <= radius) {
      towTrucks.push({
        ...truck,
        distance: Math.round(distance * 10) / 10, // e.g. 4.7 km
        estimatedArrivalMinutes: Math.ceil((distance / 40) * 60), // ~40km/h average
      });
    }
  });

  // Sort: closest truck first
  return towTrucks.sort((a, b) => a.distance - b.distance);
};

// ─────────────────────────────────────────────────────────
// Tow truck driver accepts a pending request
// ─────────────────────────────────────────────────────────
exports.acceptTowRequest = async (requestId, towTruckId) => {
  const requestRef = db.collection('towRequests').doc(requestId);

  // Use a transaction to prevent race conditions (two drivers accepting same request)
  return await db.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);

    if (!requestSnap.exists) {
      throw new Error('Tow request not found');
    }

    const requestData = requestSnap.data();

    if (requestData.status !== 'pending') {
      throw new Error('This request has already been accepted by another driver');
    }

    // Update the request status
    transaction.update(requestRef, {
      status: 'accepted',
      assignedTowTruckId: towTruckId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark the tow truck as unavailable
    const truckRef = db.collection('towTrucks').doc(towTruckId);
    transaction.update(truckRef, { isAvailable: false });

    return {
      id: requestId,
      ...requestData,
      status: 'accepted',
      assignedTowTruckId: towTruckId,
      acceptedAt: new Date().toISOString(),
    };
  });
};

// ─────────────────────────────────────────────────────────
// Get a single tow truck's profile by ID
// ─────────────────────────────────────────────────────────
exports.getTowTruckById = async (towTruckId) => {
  const doc = await db.collection('towTrucks').doc(towTruckId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
};
