// src/controllers/mechanics.controller.js
const { db } = require('../config/firebase');

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
// Returns all mechanics who are currently available and online
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

module.exports = {
  getJobRequests,
  getActiveJobs,
  getDashboardStats,
  getAvailableMechanics,
};
