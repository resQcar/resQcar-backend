const { db } = require("../config/firebase");
const jobsService = require('../services/jobs.service');

// Imanjith's function
async function acceptOffer(req, res) {
  const { offerId } = req.params;
  try {
    const result = await db.runTransaction(async (transaction) => {
      const offerRef = db.collection("offers").doc(offerId);
      const offerSnap = await transaction.get(offerRef);
      if (!offerSnap.exists) throw new Error("OFFER_NOT_FOUND");
      const offer = offerSnap.data();
      if (offer.status !== "OFFERED") throw new Error("OFFER_ALREADY_PROCESSED");
      const bookingRef = db.collection("bookings").doc(offer.bookingId);
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) throw new Error("BOOKING_NOT_FOUND");
      const booking = bookingSnap.data();
      if (booking.status === "ASSIGNED") throw new Error("BOOKING_ALREADY_ASSIGNED");
      transaction.update(offerRef, { status: "ACCEPTED", acceptedAt: new Date().toISOString() });
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
    return res.json({ success: true, job: result });
  } catch (error) {
    console.error(error);
    if (error.message === "OFFER_NOT_FOUND") return res.status(404).json({ error: "Offer not found" });
    if (error.message === "OFFER_ALREADY_PROCESSED") return res.status(409).json({ error: "Offer already processed" });
    if (error.message === "BOOKING_ALREADY_ASSIGNED") return res.status(409).json({ error: "Booking already assigned" });
    return res.status(500).json({ error: "Server error" });
  }
}

// Shevon's functions
async function updateJobStatus(req, res) {
  try {
    const jobId = req.params.id;
    const { status } = req.body;
    const validStatuses = ['en-route', 'arrived', 'in-progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    const updatedJob = await jobsService.updateJobStatus(jobId, status);
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
      error: error.message
    });
  }
}

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
      error: error.message
    });
  }
}

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
      error: error.message
    });
  }
}

module.exports = { acceptOffer, updateJobStatus, completeJob, requestAdditionalWork };