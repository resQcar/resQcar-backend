// src/controllers/jobs.controller.js
const { db } = require("../config/firebase");
const jobsService = require('../services/jobs.service');
const { getIO } = require('../websocket/socket');

// Imanjith's function
async function acceptOffer(req, res) {
  const { offerId } = req.params;
  const mechanicId = req.user.uid;
  try {
    const result = await db.runTransaction(async (transaction) => {
      const offerRef = db.collection("offers").doc(offerId);
      const offerSnap = await transaction.get(offerRef);
      if (!offerSnap.exists) {
        throw new Error("OFFER_NOT_FOUND");
      }
      const offer = offerSnap.data();
      if (offer.mechanicId !== mechanicId) {
        throw new Error("OFFER_NOT_FOR_YOU");
      }
      if (offer.status !== "OFFERED") {
        throw new Error("OFFER_ALREADY_PROCESSED");
      }
      const bookingRef = db.collection("bookings").doc(offer.bookingId);
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = bookingSnap.data();
      if (booking.status === "ASSIGNED") {
        throw new Error("BOOKING_ALREADY_ASSIGNED");
      }
      transaction.update(offerRef, {
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
      });
      const jobRef = db.collection("jobs").doc();
      const job = {
        jobId: jobRef.id,
        bookingId: offer.bookingId,
        customerId: booking.customerId,
        mechanicId: offer.mechanicId,
        status: "ACCEPTED",
        createdAt: new Date().toISOString(),
      };
      transaction.set(jobRef, job);
      transaction.update(bookingRef, {
        status: "ASSIGNED",
        assignedMechanicId: offer.mechanicId,
        jobId: jobRef.id,
      });
      return job;
    });

    // WebSocket — notify customer and mechanic in real time
    const io = getIO();
    if (io) {
      io.to(`customer_${result.customerId}`).emit('job_assigned', {
        jobId: result.jobId,
        mechanicId: result.mechanicId,
        status: 'ACCEPTED',
        message: 'A mechanic has accepted your request'
      });
      io.to(`mechanic_${result.mechanicId}`).emit('job_assigned', {
        jobId: result.jobId,
        customerId: result.customerId,
        status: 'ACCEPTED',
        message: 'Job assigned to you successfully'
      });
    }

    return res.json({ success: true, job: result });
  } catch (error) {
    console.error(error);
    if (error.message === "OFFER_NOT_FOUND")
      return res.status(404).json({ error: "Offer not found" });
    if (error.message === "OFFER_NOT_FOR_YOU")
      return res.status(403).json({ error: "This offer was not assigned to you" });
    if (error.message === "OFFER_ALREADY_PROCESSED")
      return res.status(409).json({ error: "Offer already processed" });
    if (error.message === "BOOKING_ALREADY_ASSIGNED")
      return res.status(409).json({ error: "Booking already assigned" });
    return res.status(500).json({ error: "Server error" });
  }
}

// Shevon's function - PUT /api/jobs/:id/status
async function updateJobStatus(req, res) {
  try {
    const jobId = req.params.id;
    const { status } = req.body;
    const validStatuses = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    const updatedJob = await jobsService.updateJobStatus(jobId, status);

    // WebSocket — notify both customer and mechanic about the status change
    const io = getIO();
    if (io && updatedJob) {
      const payload = { jobId, status, updatedAt: new Date().toISOString() };
      io.to(`customer_${updatedJob.customerId}`).emit('booking_status_changed', payload);
      io.to(`mechanic_${updatedJob.mechanicId}`).emit('booking_status_changed', payload);
    }

    res.status(200).json({
      success: true,
      message: `Job status updated to ${status}`,
      data: updatedJob
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status',
    });
  }
}

// Shevon's function - PUT /api/jobs/:id/complete
async function completeJob(req, res) {
  try {
    const jobId = req.params.id;
    const { totalAmount, notes } = req.body;
    if (!totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'totalAmount is required'
      });
    }
    const completedJob = await jobsService.completeJob(jobId, totalAmount, notes);

    // WebSocket — notify both parties that job is complete
    const io = getIO();
    if (io && completedJob) {
      const payload = {
        jobId,
        totalAmount,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      io.to(`customer_${completedJob.customerId}`).emit('job_completed', payload);
      io.to(`mechanic_${completedJob.mechanicId}`).emit('job_completed', payload);
    }

    res.status(200).json({
      success: true,
      message: 'Job completed successfully',
      data: completedJob
    });
  } catch (error) {
    console.error('Error completing job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete job',
    });
  }
}

// Shevon's function - POST /api/jobs/:id/additional-work
async function requestAdditionalWork(req, res) {
  try {
    const jobId = req.params.id;
    const { description, estimatedCost } = req.body;
    if (!description || !estimatedCost) {
      return res.status(400).json({
        success: false,
        message: 'description and estimatedCost are required'
      });
    }
    const result = await jobsService.requestAdditionalWork(jobId, description, estimatedCost);

    // WebSocket — notify customer that mechanic is requesting additional work
    const io = getIO();
    if (io) {
      const jobSnap = await db.collection('jobs').doc(jobId).get();
      if (jobSnap.exists) {
        io.to(`customer_${jobSnap.data().customerId}`).emit('additional_work_requested', {
          jobId,
          description,
          estimatedCost,
          status: 'pending'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Additional work requested successfully',
      data: result
    });
  } catch (error) {
    console.error('Error requesting additional work:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request additional work',
    });
  }
}

// Shevon's function - POST /api/jobs/:id/photos
async function uploadJobPhotos(req, res) {
  try {
    const jobId = req.params.id;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos uploaded'
      });
    }
    const photoUrls = await jobsService.uploadJobPhotos(jobId, req.files);
    res.status(201).json({
      success: true,
      message: `${photoUrls.length} photo(s) uploaded successfully`,
      data: photoUrls
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photos',
    });
  }
}

module.exports = { acceptOffer, updateJobStatus, completeJob, requestAdditionalWork, uploadJobPhotos };
