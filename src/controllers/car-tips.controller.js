// src/controllers/car-tips.controller.js
const { db } = require('../config/firebase');

// GET /api/car-tips/today
// Returns the tip for today based on day-of-year rotation
exports.getTodaysTip = async (req, res) => {
  try {
    const snapshot = await db
      .collection('car_tips')
      .where('active', '==', true)
      .orderBy('dayIndex', 'asc')
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No car tips found. Run the seed script first.' });
    }

    const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Rotate by day-of-year so the tip changes every day automatically
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const tip = tips[dayOfYear % tips.length];

    return res.status(200).json({
      tip,
      date: now.toISOString().split('T')[0],  // e.g. "2026-03-19"
      totalTips: tips.length,
    });
  } catch (err) {
    console.error('getTodaysTip error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch daily tip.' });
  }
};

// GET /api/car-tips
// Returns all active tips (useful for admin / browsing all tips)
exports.getAllTips = async (req, res) => {
  try {
    const snapshot = await db
      .collection('car_tips')
      .where('active', '==', true)
      .orderBy('dayIndex', 'asc')
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No car tips found.' });
    }

    const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ tips, total: tips.length });
  } catch (err) {
    console.error('getAllTips error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch tips.' });
  }
};

// POST /api/car-tips   (admin: add a new tip)
exports.addTip = async (req, res) => {
  try {
    const { emoji, category, tip } = req.body;

    if (!tip || String(tip).trim().length < 10) {
      return res.status(400).json({ message: 'tip text is required (min 10 chars).' });
    }

    // Get current count to assign next dayIndex
    const snapshot = await db.collection('car_tips').orderBy('dayIndex', 'desc').limit(1).get();
    const lastIndex = snapshot.empty ? -1 : snapshot.docs[0].data().dayIndex;

    const ref = await db.collection('car_tips').add({
      emoji: emoji || '💡',
      category: category || 'General',
      tip: String(tip).trim(),
      dayIndex: lastIndex + 1,
      active: true,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message: 'Tip added.', id: ref.id });
  } catch (err) {
    console.error('addTip error:', err.message);
    return res.status(500).json({ message: 'Failed to add tip.' });
  }
};

// PATCH /api/car-tips/:id   (admin: edit a tip)
exports.updateTip = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, category, tip, active } = req.body;

    const ref = db.collection('car_tips').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: 'Tip not found.' });

    const updates = {};
    if (emoji !== undefined) updates.emoji = emoji;
    if (category !== undefined) updates.category = category;
    if (tip !== undefined) updates.tip = String(tip).trim();
    if (active !== undefined) updates.active = Boolean(active);

    await ref.update(updates);
    return res.status(200).json({ message: 'Tip updated.' });
  } catch (err) {
    console.error('updateTip error:', err.message);
    return res.status(500).json({ message: 'Failed to update tip.' });
  }
};

// DELETE /api/car-tips/:id   (admin: soft-delete by setting active = false)
exports.deleteTip = async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('car_tips').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: 'Tip not found.' });

    await ref.update({ active: false });
    return res.status(200).json({ message: 'Tip deactivated.' });
  } catch (err) {
    console.error('deleteTip error:', err.message);
    return res.status(500).json({ message: 'Failed to delete tip.' });
  }
};