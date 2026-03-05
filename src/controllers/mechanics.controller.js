// src/controllers/mechanics.controller.js
const { db } = require('../config/firebase');

// Haversine distance helpers
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

// GET /api/mechanics/job-requests?mechanicId=xxx
const getJobRequests = async (req, res) => {
  try {
    const { mechanicId } = req.query;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required as a query param' });
    }

    const snapshot = await db
      .collection('bookings')
      .where('status', '==', 'REQUESTED')
      .orderBy('createdAt', 'desc')
      .get();

    const jobRequests = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.mechanicId || data.mechanicId === mechanicId) {
        jobRequests.push({ id: doc.id, ...data });
      }
    });

    return res.status(200).json({ success: true, jobRequests });
  } catch (error) {
    console.error('getJobRequests error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/mechanics/active-jobs?mechanicId=xxx
const getActiveJobs = async (req, res) => {
  try {
    const { mechanicId } = req.query;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required as a query param' });
    }

    const activeStatuses = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'REPAIRING'];

    const snapshot = await db
      .collection('bookings')
      .where('mechanicId', '==', mechanicId)
      .where('status', 'in', activeStatuses)
      .get();

    const activeJobs = [];
    snapshot.forEach((doc) => {
      activeJobs.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ success: true, activeJobs });
  } catch (error) {
    console.error('getActiveJobs error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/mechanics/dashboard?mechanicId=xxx
const getDashboardStats = async (req, res) => {
  try {
    const { mechanicId } = req.query;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required as a query param' });
    }

    const completedSnapshot = await db
      .collection('bookings')
      .where('mechanicId', '==', mechanicId)
      .where('status', '==', 'COMPLETED')
      .get();

    let totalEarnings = 0;
    let todayEarnings = 0;
    let completedJobs = 0;
    let totalRating = 0;
    let ratingCount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    completedSnapshot.forEach((doc) => {
      const data = doc.data();
      completedJobs++;

      const earning = data.finalAmount || data.estimatedAmount || 0;
      totalEarnings += earning;

      const completedAt = data.completedAt?.toDate?.() || new Date(data.completedAt);
      if (completedAt >= todayStart) {
        todayEarnings += earning;
      }

      if (data.rating) {
        totalRating += data.rating;
        ratingCount++;
      }
    });

    const averageRating = ratingCount > 0
      ? Math.round((totalRating / ratingCount) * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        todayEarnings,
        totalEarnings,
        completedJobs,
        averageRating,
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/mechanics/available
const getAvailableMechanics = async (req, res) => {
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

    return res.status(200).json({ success: true, count: mechanics.length, mechanics });
  } catch (error) {
    console.error('getAvailableMechanics error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/mechanics/nearby?lat=xxx&lng=xxx&radiusKm=10
const getNearbyMechanics = async (req, res) => {
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
