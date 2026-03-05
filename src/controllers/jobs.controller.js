const { db } = require("../config/firebase");

async function acceptOffer(req, res) {
  const { offerId } = req.params;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const offerRef = db.collection("offers").doc(offerId);
      const offerSnap = await transaction.get(offerRef);

      if (!offerSnap.exists) {
        throw new Error("OFFER_NOT_FOUND");
      }

      const offer = offerSnap.data();

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

      // 1️⃣ Update offer
      transaction.update(offerRef, {
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
      });

      // 2️⃣ Create job
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

      // 3️⃣ Update booking
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

    if (error.message === "OFFER_NOT_FOUND")
      return res.status(404).json({ error: "Offer not found" });

    if (error.message === "OFFER_ALREADY_PROCESSED")
      return res.status(409).json({ error: "Offer already processed" });

    if (error.message === "BOOKING_ALREADY_ASSIGNED")
      return res.status(409).json({ error: "Booking already assigned" });

    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { acceptOffer };