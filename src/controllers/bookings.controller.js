// src/controllers/bookings.controller.js
const { db } = require('../config/firebase');
const { getIO } = require('../websocket/socket');
const admin = require('firebase-admin');

// ─────────────────────────────────────────────
// GET /api/jobs/:id
// Returns full details of a single job
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
// Mechanic accepts a job request
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
      return res.status(400).json({ error: 'Job is no longer available (already accepted or closed)' });
    }

    await jobRef.update({
      status: 'ACCEPTED',
      mechanicId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify customer via WebSocket
    const io = getIO();
    if (io) {
      const customerId = jobDoc.data().customerId;
      io.to(`customer_${customerId}`).emit('job_status_update', {
        jobId: id,
        status: 'ACCEPTED',
        mechanicId,
      });
    }

    return res.status(200).json({ success: true, message: 'Job accepted successfully' });
  } catch (error) {
    console.error('acceptJob error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/jobs/:id/reject
// Body: { mechanicId }
// Mechanic rejects a job request
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
// Body: { mechanicId, status }
// status can be: 'EN_ROUTE' | 'ARRIVED' | 'REPAIRING'
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

    if (jobDoc.data().mechanicId !== mechanicId) {
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

    // Notify customer live via WebSocket
    const io = getIO();
    if (io) {
      const customerId = jobDoc.data().customerId;
      io.to(`customer_${customerId}`).emit('job_status_update', {
        jobId: id,
        status,
        mechanicId,
      });
    }

    return res.status(200).json({ success: true, message: `Job status updated to: ${status}` });
  } catch (error) {
    console.error('updateJobStatus error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/jobs/:id/additional-work
// Body: { mechanicId, description, additionalCost }
// Mechanic reports additional issues found
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

    // Notify customer via WebSocket
    const io = getIO();
    if (io) {
      const customerId = jobDoc.data().customerId;
      io.to(`customer_${customerId}`).emit('additional_work_reported', {
        jobId: id,
        additionalWork: additionalWorkEntry,
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
// Mechanic marks job as complete
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

    // Notify customer via WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id,
        status: 'COMPLETED',
      });
    }

    return res.status(200).json({ success: true, message: 'Job completed successfully' });
  } catch (error) {
    console.error('completeJob error:', error);
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
};