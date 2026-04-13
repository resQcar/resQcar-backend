// src/routes/car-tips.routes.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ctrl = require('../controllers/car-tips.controller');

// Public (logged-in customers see today's tip)
router.get('/today', requireAuth, ctrl.getTodaysTip);

// Public listing (all tips — could restrict to admin if needed)
router.get('/', requireAuth, ctrl.getAllTips);

// Admin only — add / edit / delete tips
router.post('/', requireAuth, requireRole('admin'), ctrl.addTip);
router.patch('/:id', requireAuth, requireRole('admin'), ctrl.updateTip);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteTip);

module.exports = router;