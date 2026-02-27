// src/controllers/bookings.controller.js
const { db } = require('../config/firebase');
const { getIO } = require('../websocket/socket');
const admin = require('firebase-admin');
const {
  notifyMechanicNewJob,
  notifyCustomerAccepted,
  notifyCustomerEnRoute,
  notifyCustomerArrived,
  notifyCustomerRepairing,
  notifyCustomerCompleted,
} = require('../services/notification.service');

// Helper: get FCM token from users collection
const getFcmToken = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().fcmToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// ─────────────────────────────────────────────
// GET /api/jobs/:id
// ─────────────────────────────────────────────
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('bookings').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.status(200).json({ success: true, job: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('getJobById error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/accept
// Body: { mechanicId }
// ─────────────────────────────────────────────
const acceptJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required' });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobDoc.data().status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Job is no longer available' });
    }

    const jobData = jobDoc.data();

    await jobRef.update({
      status: 'ACCEPTED',
      mechanicId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status: 'ACCEPTED', mechanicId,
      });
    }

    // FCM: notify customer mechanic accepted
    const customerFcmToken = await getFcmToken(jobData.customerId);
    const mechanicDoc = await db.collection('users').doc(mechanicId).get();
    const mechanicName = mechanicDoc.exists ? mechanicDoc.data().name || 'Your mechanic' : 'Your mechanic';
    await notifyCustomerAccepted(customerFcmToken, id, mechanicName);

    return res.status(200).json({ success: true, message: 'Job accepted successfully' });
  } catch (error) {
    console.error('acceptJob error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/reject
// Body: { mechanicId }
// ─────────────────────────────────────────────
const rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required' });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await jobRef.update({
      rejectedBy: admin.firestore.FieldValue.arrayUnion(mechanicId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, message: 'Job rejected' });
  } catch (error) {
    console.error('rejectJob error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/status
// Body: { mechanicId, status } → EN_ROUTE | ARRIVED | REPAIRING
// ─────────────────────────────────────────────
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId, status } = req.body;

    const validStatuses = ['EN_ROUTE', 'ARRIVED', 'REPAIRING'];

    if (!mechanicId || !status) {
      return res.status(400).json({ error: 'mechanicId and status are required' });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    if (jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'EN_ROUTE') updateData.enRouteAt = admin.firestore.FieldValue.serverTimestamp();
    if (status === 'ARRIVED') updateData.arrivedAt = admin.firestore.FieldValue.serverTimestamp();
    if (status === 'REPAIRING') updateData.repairingAt = admin.firestore.FieldValue.serverTimestamp();

    await jobRef.update(updateData);

    // WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status, mechanicId,
      });
    }

    // FCM: notify customer based on status
    const customerFcmToken = await getFcmToken(jobData.customerId);
    if (status === 'EN_ROUTE') await notifyCustomerEnRoute(customerFcmToken, id);
    if (status === 'ARRIVED') await notifyCustomerArrived(customerFcmToken, id);
    if (status === 'REPAIRING') await notifyCustomerRepairing(customerFcmToken, id);

    return res.status(200).json({ success: true, message: `Job status updated to: ${status}` });
  } catch (error) {
    console.error('updateJobStatus error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/jobs/:id/additional-work
// Body: { mechanicId, description, additionalCost }
// ─────────────────────────────────────────────
const addAdditionalWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId, description, additionalCost } = req.body;

    if (!mechanicId || !description) {
      return res.status(400).json({ error: 'mechanicId and description are required' });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobDoc.data().mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    const additionalWorkEntry = {
      description,
      additionalCost: additionalCost || 0,
      reportedAt: new Date().toISOString(),
    };

    await jobRef.update({
      additionalWork: admin.firestore.FieldValue.arrayUnion(additionalWorkEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // WebSocket
    const io = getIO();
    if (io) {
      const customerId = jobDoc.data().customerId;
      io.to(`customer_${customerId}`).emit('additional_work_reported', {
        jobId: id, additionalWork: additionalWorkEntry,
      });
    }

    return res.status(200).json({ success: true, message: 'Additional work reported', additionalWork: additionalWorkEntry });
  } catch (error) {
    console.error('addAdditionalWork error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/complete
// Body: { mechanicId, finalAmount }
// ─────────────────────────────────────────────
const completeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId, finalAmount } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required' });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    if (jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    if (jobData.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Job is already completed' });
    }

    await jobRef.update({
      status: 'COMPLETED',
      finalAmount: finalAmount || jobData.estimatedAmount || 0,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status: 'COMPLETED',
      });
    }

    // FCM: notify customer job complete
    const customerFcmToken = await getFcmToken(jobData.customerId);
    await notifyCustomerCompleted(customerFcmToken, id);

    return res.status(200).json({ success: true, message: 'Job completed successfully' });
  } catch (error) {
    console.error('completeJob error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/arrive
// Body: { mechanicId }
// Mechanic marks they have arrived at location
// ─────────────────────────────────────────────
const arriveAtJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId } = req.body;

    if (!mechanicId) {
      return res.status(400).json({ error: 'mechanicId is required' });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    if (jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    await jobRef.update({
      status: 'ARRIVED',
      arrivedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id,
        status: 'ARRIVED',
        mechanicId,
      });
    }

    // FCM: notify customer mechanic arrived
    const customerFcmToken = await getFcmToken(jobData.customerId);
    await notifyCustomerArrived(customerFcmToken, id);

    return res.status(200).json({ success: true, message: 'Arrival confirmed' });
  } catch (error) {
    console.error('arriveAtJob error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getJobById,
  acceptJob,
  rejectJob,
  updateJobStatus,
  addAdditionalWork,
  completeJob,
  arriveAtJob,
};