// src/controllers/mechanics.controller.js
const { db } = require('../config/firebase');
const { distanceKm } = require('../services/geo.service');

// GET /api/mechanics/job-requests — mechanicId from token
const getJobRequests = async (req, res) => {
  try {
    const mechanicId = req.user.uid;
    const snapshot = await db.collection('bookings').where('status','==','REQUESTED').orderBy('createdAt','desc').get();
    const jobRequests = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.mechanicId || data.mechanicId === mechanicId) jobRequests.push({ id: doc.id, ...data });
    });
    return res.status(200).json({ success: true, jobRequests });
  } catch (error) { console.error('getJobRequests error:', error); return res.status(500).json({ error: 'Failed to retrieve job requests.' }); }
};

// GET /api/mechanics/active-jobs — mechanicId from token
const getActiveJobs = async (req, res) => {
  try {
    const mechanicId = req.user.uid;
    const snapshot = await db.collection('bookings')
      .where('mechanicId','==',mechanicId).where('status','in',['ACCEPTED','EN_ROUTE','ARRIVED','REPAIRING']).get();
    const activeJobs = [];
    snapshot.forEach(doc => activeJobs.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, activeJobs });
  } catch (error) { console.error('getActiveJobs error:', error); return res.status(500).json({ error: 'Failed to retrieve active jobs.' }); }
};

// GET /api/mechanics/dashboard — mechanicId from token
const getDashboardStats = async (req, res) => {
  try {
    const mechanicId = req.user.uid;
    const snap = await db.collection('bookings').where('mechanicId','==',mechanicId).where('status','==','COMPLETED').get();
    let totalEarnings=0, todayEarnings=0, completedJobs=0, totalRating=0, ratingCount=0;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    snap.forEach(doc => {
      const data = doc.data(); completedJobs++;
      const earning = Number(data.finalAmount || data.estimatedAmount || 0);
      totalEarnings += earning;
      const ca = data.completedAt?.toDate?.() || new Date(data.completedAt);
      if (ca >= todayStart) todayEarnings += Number(earning);
      if (data.rating) { totalRating += data.rating; ratingCount++; }
    });
    const averageRating = ratingCount > 0 ? Math.round((totalRating/ratingCount)*10)/10 : 0;
    return res.status(200).json({ success: true, stats: { todayEarnings, totalEarnings, completedJobs, averageRating } });
  } catch (error) { console.error('getDashboardStats error:', error); return res.status(500).json({ error: 'Failed to retrieve dashboard stats.' }); }
};

const getAvailableMechanics = async (req, res) => {
  try {
    const snap = await db.collection('mechanics').where('isAvailable','==',true).where('isOnline','==',true).get();
    const mechanics = [];
    snap.forEach(doc => mechanics.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, count: mechanics.length, mechanics });
  } catch (error) { console.error('getAvailableMechanics error:', error); return res.status(500).json({ error: 'Failed to retrieve available mechanics.' }); }
};

const getNearbyMechanics = async (req, res) => {
  try {
    const { lat, lng, radiusKm = '10' } = req.query;
    const radius = parseFloat(radiusKm);
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required as query params' });
    if (isNaN(radius) || radius <= 0 || radius > 100) {
      return res.status(400).json({ error: 'radiusKm must be a number between 0 and 100' });
    }
    const userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const snap = await db.collection('mechanics').where('isAvailable','==',true).where('isOnline','==',true).get();
    const nearby = [];
    snap.forEach(doc => {
      const m = doc.data();
      if (m.location?.lat != null && m.location?.lng != null) {
        const dist = distanceKm(userLocation, m.location);
        if (dist <= radius) nearby.push({ id: doc.id, distanceKm: dist, ...m });
      }
    });
    nearby.sort((a,b) => a.distanceKm - b.distanceKm);
    return res.status(200).json({ success: true, count: nearby.length, mechanics: nearby });
  } catch (error) { console.error('getNearbyMechanics error:', error); return res.status(500).json({ error: 'Failed to retrieve nearby mechanics.' }); }
};

const getMechanicProfile = async (req, res) => {
  try {
    const doc = await db.collection('mechanics').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Mechanic not found' });
    const m = { id: doc.id, ...doc.data() };
    return res.status(200).json({ success: true, profile: {
      id: m.id, name: m.name||'', phone: m.phone||'',
      isAvailable: !!m.isAvailable, isOnline: !!m.isOnline,
      location: m.location||null, specializations: m.specializations||[],
      ratingAvg: m.ratingAvg||0, ratingCount: m.ratingCount||0,
    }});
  } catch (error) { console.error('getMechanicProfile error:', error); return res.status(500).json({ error: 'Failed to retrieve mechanic profile.' }); }
};

const getMechanicSpecializations = async (req, res) => {
  try {
    const doc = await db.collection('mechanics').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Mechanic not found' });
    return res.status(200).json({ success: true, mechanicId: req.params.id, specializations: doc.data().specializations||[] });
  } catch (error) { console.error('getMechanicSpecializations error:', error); return res.status(500).json({ error: 'Failed to retrieve specializations.' }); }
};

// GET /api/mechanics/profile — returns the logged-in mechanic's own profile
const getMyProfile = async (req, res) => {
  try {
    const mechanicId = req.user.uid;
    const doc = await db.collection('mechanics').doc(mechanicId).get();
    // Profile may not exist yet (first-time mechanic) — return empty defaults
    const m = doc.exists ? { id: doc.id, ...doc.data() } : { id: mechanicId };
    return res.status(200).json({ success: true, profile: {
      id: m.id, name: m.name||'', phone: m.phone||'',
      isAvailable: !!m.isAvailable, isOnline: !!m.isOnline,
      location: m.location||null, specializations: m.specializations||[],
      ratingAvg: m.ratingAvg||0, ratingCount: m.ratingCount||0,
      garageName: m.garageName||'', profileImageUrl: m.profileImageUrl||'',
    }});
  } catch (error) { console.error('getMyProfile error:', error); return res.status(500).json({ error: 'Failed to retrieve profile.' }); }
};

// PUT /api/mechanics/availability — mechanicId from token (SECURITY FIX)
const updateMechanicAvailability = async (req, res) => {
  try {
    const mechanicId = req.user.uid;   // ← FIX: was req.body.mechanicId
    const { isAvailable, isOnline } = req.body;
    const hasIsAvailable = typeof isAvailable === 'boolean';
    const hasIsOnline    = typeof isOnline    === 'boolean';
    if (!hasIsAvailable && !hasIsOnline)
      return res.status(400).json({ error: 'Provide isAvailable and/or isOnline as boolean' });
    const updateData = { updatedAt: new Date().toISOString() };
    if (hasIsAvailable) updateData.isAvailable = isAvailable;
    if (hasIsOnline)    updateData.isOnline    = isOnline;
    await db.collection('mechanics').doc(mechanicId).set(updateData, { merge: true });
    return res.status(200).json({ ok: true, mechanicId, ...updateData });
  } catch (error) { console.error('updateMechanicAvailability error:', error); return res.status(500).json({ error: 'Failed to update availability.' }); }
};

// PUT /api/mechanics/profile — mechanicId from token (SECURITY FIX)
const updateMechanicProfile = async (req, res) => {
  try {
    const mechanicId = req.user.uid;   // ← FIX: was req.body.mechanicId
    const { name, phone, specializations, location, garageName, profileImageUrl } = req.body;
    const updateData = { updatedAt: new Date().toISOString() };
    if (typeof name             === 'string') updateData.name             = name.trim();
    if (typeof phone            === 'string') updateData.phone            = phone.trim();
    if (typeof garageName       === 'string') updateData.garageName       = garageName.trim();
    if (typeof profileImageUrl  === 'string') updateData.profileImageUrl  = profileImageUrl.trim();
    if (Array.isArray(specializations))
      updateData.specializations = specializations.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean);
    if (location && typeof location === 'object') {
      const lat = Number(location.lat), lng = Number(location.lng);
      if (isNaN(lat)||isNaN(lng)) return res.status(400).json({ error: 'location.lat and location.lng must be numbers' });
      updateData.location = { lat, lng };
    }
    if (Object.keys(updateData).length === 1) return res.status(400).json({ error: 'No valid fields to update' });
    await db.collection('mechanics').doc(mechanicId).set(updateData, { merge: true });
    return res.status(200).json({ ok: true, mechanicId, updated: updateData });
  } catch (error) { console.error('updateMechanicProfile error:', error); return res.status(500).json({ error: 'Failed to update profile.' }); }
};

module.exports = {
  getJobRequests, getActiveJobs, getDashboardStats, getAvailableMechanics,
  getNearbyMechanics, getMechanicProfile, getMyProfile, getMechanicSpecializations,
  updateMechanicAvailability, updateMechanicProfile,
};
