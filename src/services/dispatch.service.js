// src/services/dispatch.service.js
const { db } = require('../config/firebase');
const { distanceKm } = require('./geo.service');
const { getIO } = require('../websocket/socket');

async function dispatchToMechanics({
  bookingId,
  location,
  issueType,
  radiusKm = 8,
  limit = 10,
  wsHub,
}) {
  const snap = await db
    .collection('mechanics')
    .where('isAvailable', '==', true)
    .where('isOnline', '==', true)
    .get();

  const mechanics = [];

  snap.forEach((doc) => {
    const m = doc.data();

    if (Array.isArray(m.specializations) && !m.specializations.includes(issueType)) {
      return;
    }

    if (m.location?.lat != null && m.location?.lng != null) {
      const d = distanceKm(location, m.location);
      if (d <= radiusKm) mechanics.push({ id: doc.id, ...m, _distanceKm: d });
    }
  });

  mechanics.sort((a, b) => a._distanceKm - b._distanceKm);
  const selected = mechanics.slice(0, limit);
  const offers = [];

  for (const mech of selected) {
    const offerRef = db.collection('offers').doc();
    const offer = {
      offerId: offerRef.id,
      bookingId,
      mechanicId: mech.id,
      status: 'OFFERED',
      issueType,
      customerLocation: location,
      createdAt: new Date().toISOString(),
    };

    await offerRef.set(offer);
    offers.push(offer);

    // Notify mechanic via Socket.IO room
    const io = getIO();
    if (io) {
      io.to(`mechanic_${mech.id}`).emit('offer_created', {
        offerId: offer.offerId,
        bookingId,
        issueType,
        customerLocation: location,
        createdAt: offer.createdAt,
      });
    }

    // Also support legacy wsHub if passed
    if (wsHub && typeof wsHub.emit === 'function') {
      wsHub.emit(`mechanic:${mech.id}`, {
        type: 'offer_created',
        offerId: offer.offerId,
        bookingId,
        issueType,
        customerLocation: location,
        createdAt: offer.createdAt,
      });
    }
  }

  return { count: offers.length, offers };
}

module.exports = { dispatchToMechanics };
