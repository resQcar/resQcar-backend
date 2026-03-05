// src/controllers/bookings.controller.js
const { db } = require("../config/firebase");
const { dispatchToMechanics } = require("../services/dispatch.service");

async function createEmergencyBooking(req, res) {
  try {
    const { customerId, location, issueType, radiusKm } = req.body;

    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!location?.lat || !location?.lng) return res.status(400).json({ error: "location {lat,lng} required" });
    if (!issueType) return res.status(400).json({ error: "issueType is required" });

    const bookingRef = db.collection("bookings").doc(); // auto id

    const booking = {
      bookingId: bookingRef.id,
      customerId,
      location,
      issueType,
      status: "REQUESTED",
      createdAt: new Date().toISOString(),
    };

    await bookingRef.set(booking);

    const wsHub = req.app.locals.wsHub;
    const dispatchResult = await dispatchToMechanics({
      bookingId: booking.bookingId,
      location,
      issueType,
      radiusKm: typeof radiusKm === "number" ? radiusKm : 8,
      limit: 10,
      wsHub,
    });

    return res.status(201).json({
      booking,
      dispatch: { sentOffers: dispatchResult.count },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { createEmergencyBooking };