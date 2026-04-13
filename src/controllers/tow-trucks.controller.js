// src/controllers/tow-trucks.controller.js
const towTruckService = require('../services/tow-trucks.service');

// POST /api/tow-trucks/request
exports.requestTowTruck = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, vehicleDetails, towTruckType, customerPhone } = req.body;
    const customerId = req.user.uid;

    if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
      return res.status(400).json({ success: false, message: 'Pickup location with latitude and longitude is required' });
    }
    if (!dropoffLocation?.latitude || !dropoffLocation?.longitude) {
      return res.status(400).json({ success: false, message: 'Drop-off location with latitude and longitude is required' });
    }
    const validTypes = ['flatbed', 'hook-chain', 'wheel-lift'];
    if (!towTruckType || !validTypes.includes(towTruckType)) {
      return res.status(400).json({ success: false, message: `Tow truck type must be one of: ${validTypes.join(', ')}` });
    }
    if (customerPhone !== undefined) {
      const phoneStr = String(customerPhone).trim();
      if (!/^\+[1-9]\d{6,14}$/.test(phoneStr)) {
        return res.status(400).json({ success: false, message: 'customerPhone must be in E.164 format (e.g. +94771234567).' });
      }
    }

    const request = await towTruckService.createTowRequest({
      customerId, customerPhone, pickupLocation, dropoffLocation, vehicleDetails, towTruckType,
    });

    res.status(201).json({ success: true, message: 'Tow truck request created successfully!', data: request });
  } catch (error) {
    console.error('Error in requestTowTruck:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create tow truck request.' });
  }
};

// GET /api/tow-trucks/available
exports.getAvailableTowTrucks = async (req, res) => {
  try {
    const { latitude, longitude, type, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ success: false, message: 'Invalid latitude or longitude' });
    }

    const towTrucks = await towTruckService.getAvailableTowTrucks({
      latitude: lat, longitude: lon, type: type || null, radius: parseFloat(radius),
    });

    res.status(200).json({
      success: true,
      count: towTrucks.length,
      searchRadius: `${radius} km`,
      message: towTrucks.length === 0 ? 'No tow trucks available in your area.' : undefined,
      data: towTrucks,
    });
  } catch (error) {
    console.error('Error in getAvailableTowTrucks:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch available tow trucks.' });
  }
};

// GET /api/tow-trucks/flatbed
exports.getFlatbedTowTrucks = async (req, res) => {
  req.query.type = 'flatbed';
  return exports.getAvailableTowTrucks(req, res);
};

// GET /api/tow-trucks/hook-chain
exports.getHookChainTowTrucks = async (req, res) => {
  req.query.type = 'hook-chain';
  return exports.getAvailableTowTrucks(req, res);
};

// GET /api/tow-trucks/wheel-lift
exports.getWheelLiftTowTrucks = async (req, res) => {
  req.query.type = 'wheel-lift';
  return exports.getAvailableTowTrucks(req, res);
};

// PUT /api/tow-trucks/accept/:id
exports.acceptTowRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    // towTruckId can come from custom claims OR from request body (more flexible)
    const towTruckId = req.user.towTruckId || req.body.towTruckId;

    if (!towTruckId) {
      return res.status(400).json({
        success: false,
        message: 'towTruckId is required in the request body (or set as a Firebase custom claim)',
      });
    }

    const updatedRequest = await towTruckService.acceptTowRequest(requestId, towTruckId);

    res.status(200).json({ success: true, message: 'Tow request accepted!', data: updatedRequest });
  } catch (error) {
    console.error('Error in acceptTowRequest:', error.message);
    if (error.message.includes('already been accepted')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to accept tow request.' });
  }
};

// GET /api/tow-trucks/:id
exports.getTowTruckProfile = async (req, res) => {
  try {
    const towTruck = await towTruckService.getTowTruckById(req.params.id);

    if (!towTruck) {
      return res.status(404).json({ success: false, message: `Tow truck with ID "${req.params.id}" not found` });
    }

    res.status(200).json({ success: true, data: towTruck });
  } catch (error) {
    console.error('Error in getTowTruckProfile:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch tow truck profile.' });
  }
};
