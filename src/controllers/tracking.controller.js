// src/controllers/tracking.controller.js
const trackingService = require('../services/tracking.service');
const { calculateETA } = require('../helpers/eta.helper');
const { db } = require('../config/firebase');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tracking/update-location
// Mechanic sends live GPS ping.
//
// FIX 1: Validation changed from (!latitude || !longitude) to (== null) check
//         so that lat/lng value of 0 does not wrongly fail validation.
// FIX 2: Saves to BOTH Firebase Realtime DB (live tracking) AND Firestore
//         mechanics.location (for nearby mechanic search).
//         Without the Firestore write, getNearbyMechanics shows stale/wrong
//         positions because it reads from Firestore, not Realtime DB.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateMechanicLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const mechanicId = req.user.uid;

    // FIX: use == null instead of !value so that 0 coordinates are accepted
    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // FIX: validate they are actual numbers (rejects strings like "abc")
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    // 1. Save to Firebase Realtime Database — used for live tracking stream
    await trackingService.updateLocation(mechanicId, lat, lng);

    // 2. Save to Firestore mechanics collection — used for nearby mechanic search
    //    This is the critical dual-write that keeps both systems in sync.
    //    Without this, POST /api/tracking/update-location and
    //    GET /api/mechanics/nearby would read from different data sources.
    await db.collection('mechanics').doc(mechanicId).set(
      {
        location: { lat, lng },
        isOnline: true,
        lastLocationUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        mechanicId,
        latitude: lat,
        longitude: lng,
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tracking/mechanic/:id
// Returns mechanic's last known GPS from Firebase Realtime Database.
// Used by Flutter map to get a single mechanic's position on demand (REST poll).
// For live streaming, Flutter should use Socket.IO join_tracking event instead.
// ─────────────────────────────────────────────────────────────────────────────
exports.getLiveLocation = async (req, res) => {
  try {
    const mechanicId = req.params.id;
    const location = await trackingService.getLocation(mechanicId);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found for this mechanic. They may not have sent a GPS ping yet.',
      });
    }

    return res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error getting location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get location',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tracking/booking/:bookingId
// PRIMARY Flutter map endpoint.
// Returns everything the map screen needs in one call:
//   - booking status
//   - pickup location (customer pin)
//   - mechanic profile (name, rating, specializations)
//   - mechanic live location from Realtime DB (mechanic moving pin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getBookingTracking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() };

    let mechanic = null;
    let mechanicLocation = null;

    if (booking.mechanicId) {
      const mechanicDoc = await db.collection('mechanics').doc(booking.mechanicId).get();

      if (mechanicDoc.exists) {
        const mechanicData = mechanicDoc.data();
        mechanic = {
          id: mechanicDoc.id,
          name: mechanicData.name || '',
          phone: mechanicData.phone || '',
          ratingAvg: mechanicData.ratingAvg || 0,
          specializations: mechanicData.specializations || [],
          // Firestore location — last known static position
          location: mechanicData.location || null,
        };
      }

      // Realtime DB location — most recent live ping
      mechanicLocation = await trackingService.getLocation(booking.mechanicId);
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId:      booking.id,
        status:         booking.status,
        pickupLocation: booking.location || null,   // customer pin on Flutter map
        customerId:     booking.customerId  || null,
        mechanicId:     booking.mechanicId  || null,
        mechanic,
        mechanicLocation, // live mechanic pin on Flutter map (from Realtime DB)
      },
    });
  } catch (error) {
    console.error('Error getting booking tracking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get booking tracking',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tracking/booking/:bookingId/location
// Clean dedicated endpoint that returns ONLY the pickup location.
// Optional but gives Flutter a clean single-purpose endpoint.
// Reviewer suggestion: add GET /api/bookings/:id/location
// Implemented here in tracking for consistency with the tracking prefix.
// ─────────────────────────────────────────────────────────────────────────────
exports.getBookingLocation = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const booking = bookingDoc.data();

    return res.status(200).json({
      success: true,
      data: {
        bookingId,
        location: booking.location || null,
        issueType: booking.issueType || null,
        status: booking.status || null,
      },
    });
  } catch (error) {
    console.error('Error getting booking location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get booking location',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tracking/eta?lat1=&lon1=&lat2=&lon2=
// Calculates distance and ETA between two GPS points.
// Used by Flutter to show "X minutes away" on the map.
// ─────────────────────────────────────────────────────────────────────────────
exports.getETA = async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    // FIX: use == null check for consistency with location validation above
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return res.status(400).json({
        success: false,
        message: 'lat1, lon1, lat2, lon2 are all required',
      });
    }

    const p1lat = Number(lat1), p1lon = Number(lon1);
    const p2lat = Number(lat2), p2lon = Number(lon2);

    if (Number.isNaN(p1lat) || Number.isNaN(p1lon) || Number.isNaN(p2lat) || Number.isNaN(p2lon)) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates must be valid numbers',
      });
    }

    const eta = calculateETA(p1lat, p1lon, p2lat, p2lon);

    return res.status(200).json({
      success: true,
      data: eta,
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate ETA',
      error: error.message,
    });
  }
};