// src/controllers/mechanics.controller.js
const { db } = require('../config/firebase');

function toRad(x) { return (x * Math.PI) / 180; }

function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

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
  } catch (error) { return res.status(500).json({ error: error.message }); }
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
  } catch (error) { return res.status(500).json({ error: error.message }); }
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
      const earning = data.finalAmount || data.estimatedAmount || 0;
      totalEarnings += earning;
      const ca = data.completedAt?.toDate?.() || new Date(data.completedAt);
      if (ca >= todayStart) todayEarnings += earning;
      if (data.rating) { totalRating += data.rating; ratingCount++; }
    });
    const averageRating = ratingCount > 0 ? Math.round((totalRating/ratingCount)*10)/10 : 0;
    return res.status(200).json({ success: true, stats: { todayEarnings, totalEarnings, completedJobs, averageRating } });
  } catch (error) { return res.status(500).json({ error: error.message }); }
};

const getAvailableMechanics = async (req, res) => {
  try {
    const snap = await db.collection('mechanics').where('isAvailable','==',true).where('isOnline','==',true).get();
    const mechanics = [];
    snap.forEach(doc => mechanics.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, count: mechanics.length, mechanics });
  } catch (error) { return res.status(500).json({ error: error.message }); }
};

const getNearbyMechanics = async (req, res) => {
  try {
    const { lat, lng, radiusKm = '10' } = req.query;
    const radius = parseFloat(radiusKm);
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required as query params' });
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
  } catch (error) { return res.status(500).json({ error: error.message }); }
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
  } catch (error) { return res.status(500).json({ error: error.message }); }
};

const getMechanicSpecializations = async (req, res) => {
  try {
    const doc = await db.collection('mechanics').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Mechanic not found' });
    return res.status(200).json({ success: true, mechanicId: req.params.id, specializations: doc.data().specializations||[] });
  } catch (error) { return res.status(500).json({ error: error.message }); }
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
  } catch (error) { return res.status(500).json({ error: error.message }); }
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
  } catch (error) { return res.status(500).json({ error: error.message }); }
};

module.exports = {
  getJobRequests, getActiveJobs, getDashboardStats, getAvailableMechanics,
  getNearbyMechanics, getMechanicProfile, getMechanicSpecializations,
  updateMechanicAvailability, updateMechanicProfile,
};