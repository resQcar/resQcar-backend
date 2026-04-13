// src/controllers/bookings.controller.js
const { db, admin } = require('../config/firebase');
const { dispatchToMechanics } = require('../services/dispatch.service');
const { getIO } = require('../websocket/socket');
const {
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
    if (userDoc.exists) return userDoc.data().fcmToken || null;
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/emergency
// Customer creates an emergency booking.
//
// FIX: customerId taken from token (req.user.uid), never from request body.
// FIX: location validation changed from (!lat || !lng) to (== null) so that
//      coordinate value 0 does not wrongly fail validation.
// ─────────────────────────────────────────────────────────────────────────────
const createEmergencyBooking = async (req, res) => {
  try {
    // Always take customerId from the verified Firebase token — never the body
    const customerId = req.user.uid;
    const { location, issueType, radiusKm } = req.body;

    // FIX: == null instead of !value so coordinate 0 is accepted
    if (location?.lat == null || location?.lng == null) {
      return res.status(400).json({ error: 'location {lat, lng} is required' });
    }
    if (!issueType) {
      return res.status(400).json({ error: 'issueType is required' });
    }

    const bookingRef = db.collection('bookings').doc();
    const booking = {
      bookingId:  bookingRef.id,
      customerId,
      location,
      issueType,
      status:    'REQUESTED',
      createdAt: new Date().toISOString(),
    };

    await bookingRef.set(booking);

    const wsHub = req.app.locals.wsHub;
    const dispatchResult = await dispatchToMechanics({
      bookingId: booking.bookingId,
      location,
      issueType,
      radiusKm:  typeof radiusKm === 'number' ? radiusKm : 8,
      limit:     10,
      wsHub,
    });

    return res.status(201).json({
      booking,
      dispatch: { sentOffers: dispatchResult.count },
    });
  } catch (err) {
    console.error('createEmergencyBooking error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id
// Returns full details of a single booking.
// ─────────────────────────────────────────────────────────────────────────────
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
    return res.status(500).json({ error: 'Failed to retrieve job.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bookings/:id/accept
// Mechanic accepts a job request.
//
// FIX: mechanicId taken from token (req.user.uid), never from request body.
// ─────────────────────────────────────────────────────────────────────────────
const acceptJob = async (req, res) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user.uid; // always from token

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });
    if (jobDoc.data().status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Job is no longer available (already accepted or closed)' });
    }

    const jobData = jobDoc.data();

    await jobRef.update({
      status:     'ACCEPTED',
      mechanicId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
    });

    // WebSocket — notify customer in real time
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status: 'ACCEPTED', mechanicId,
      });
    }

    // FCM push notification
    const customerFcmToken = await getFcmToken(jobData.customerId);
    const mechanicDoc = await db.collection('users').doc(mechanicId).get();
    const mechanicName = mechanicDoc.exists ? mechanicDoc.data().name || 'Your mechanic' : 'Your mechanic';
    await notifyCustomerAccepted(customerFcmToken, id, mechanicName);

    return res.status(200).json({ success: true, message: 'Job accepted successfully' });
  } catch (error) {
    console.error('acceptJob error:', error);
    return res.status(500).json({ error: 'Failed to accept job.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bookings/:id/reject
// Mechanic rejects a job request.
//
// FIX: mechanicId from token, not body.
// ─────────────────────────────────────────────────────────────────────────────
const rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user.uid; // always from token

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });

    await jobRef.update({
      rejectedBy: admin.firestore.FieldValue.arrayUnion(mechanicId),
      updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, message: 'Job rejected' });
  } catch (error) {
    console.error('rejectJob error:', error);
    return res.status(500).json({ error: 'Failed to reject job.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bookings/:id/status
// Mechanic updates trip status: EN_ROUTE | ARRIVED | REPAIRING
//
// FIX: mechanicId from token, not body.
// ─────────────────────────────────────────────────────────────────────────────
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const mechanicId = req.user.uid; // always from token
    const validStatuses = ['EN_ROUTE', 'ARRIVED', 'REPAIRING'];

    if (!status) return res.status(400).json({ error: 'status is required' });
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });

    const jobData = jobDoc.data();
    if (jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status === 'EN_ROUTE')  updateData.enRouteAt   = admin.firestore.FieldValue.serverTimestamp();
    if (status === 'ARRIVED')   updateData.arrivedAt   = admin.firestore.FieldValue.serverTimestamp();
    if (status === 'REPAIRING') updateData.repairingAt = admin.firestore.FieldValue.serverTimestamp();

    await jobRef.update(updateData);

    // WebSocket
    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status, mechanicId,
      });
    }

    // FCM
    const customerFcmToken = await getFcmToken(jobData.customerId);
    if (status === 'EN_ROUTE')  await notifyCustomerEnRoute(customerFcmToken, id);
    if (status === 'ARRIVED')   await notifyCustomerArrived(customerFcmToken, id);
    if (status === 'REPAIRING') await notifyCustomerRepairing(customerFcmToken, id);

    return res.status(200).json({ success: true, message: `Job status updated to: ${status}` });
  } catch (error) {
    console.error('updateJobStatus error:', error);
    return res.status(500).json({ error: 'Failed to update job status.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/:id/additional-work
// Mechanic reports extra issues found during repair.
// ─────────────────────────────────────────────────────────────────────────────
const addAdditionalWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, additionalCost } = req.body;
    const mechanicId = req.user.uid;

    if (!description) return res.status(400).json({ error: 'description is required' });

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });
    if (jobDoc.data().mechanicId && jobDoc.data().mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    const additionalWorkEntry = {
      description,
      additionalCost: additionalCost || 0,
      reportedAt:     new Date().toISOString(),
    };

    await jobRef.update({
      additionalWork: admin.firestore.FieldValue.arrayUnion(additionalWorkEntry),
      updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
    });

    const io = getIO();
    if (io) {
      io.to(`customer_${jobDoc.data().customerId}`).emit('additional_work_reported', {
        jobId: id, additionalWork: additionalWorkEntry,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Additional work reported',
      additionalWork: additionalWorkEntry,
    });
  } catch (error) {
    console.error('addAdditionalWork error:', error);
    return res.status(500).json({ error: 'Failed to report additional work.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bookings/:id/arrive
// Mechanic marks arrival at customer location.
// ─────────────────────────────────────────────────────────────────────────────
const arriveAtJob = async (req, res) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user.uid;

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });

    const jobData = jobDoc.data();
    if (jobData.mechanicId && jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }

    await jobRef.update({
      status:    'ARRIVED',
      arrivedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status: 'ARRIVED', mechanicId,
      });
    }

    const customerFcmToken = await getFcmToken(jobData.customerId);
    await notifyCustomerArrived(customerFcmToken, id);

    return res.status(200).json({ success: true, message: 'Arrival confirmed' });
  } catch (error) {
    console.error('arriveAtJob error:', error);
    return res.status(500).json({ error: 'Failed to confirm arrival.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/bookings/:id/complete
// Mechanic marks job as complete and records final charge.
// ─────────────────────────────────────────────────────────────────────────────
const completeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalAmount } = req.body;
    const mechanicId = req.user.uid;

    const jobRef = db.collection('bookings').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });

    const jobData = jobDoc.data();
    if (jobData.mechanicId && jobData.mechanicId !== mechanicId) {
      return res.status(403).json({ error: 'You are not assigned to this job' });
    }
    if (jobData.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Job is already completed' });
    }

    await jobRef.update({
      status:      'COMPLETED',
      finalAmount: (finalAmount !== undefined && finalAmount !== null) ? finalAmount : (jobData.estimatedAmount || 0),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    });

    const io = getIO();
    if (io) {
      io.to(`customer_${jobData.customerId}`).emit('job_status_update', {
        jobId: id, status: 'COMPLETED',
      });
    }

    const customerFcmToken = await getFcmToken(jobData.customerId);
    await notifyCustomerCompleted(customerFcmToken, id);

    return res.status(200).json({ success: true, message: 'Job completed successfully' });
  } catch (error) {
    console.error('completeJob error:', error);
    return res.status(500).json({ error: 'Failed to complete job.' });
  }
};

module.exports = {
  createEmergencyBooking,
  getJobById,
  acceptJob,
  rejectJob,
  updateJobStatus,
  addAdditionalWork,
  arriveAtJob,
  completeJob,
};