// src/controllers/tow-trucks.controller.js
// =====================================================
// Controller - Business Logic for Each Endpoint
// =====================================================
// Think of this as the "manager" who:
// 1. Receives the customer's request
// 2. Checks if everything looks correct
// 3. Asks the service (warehouse worker) to do the database work
// 4. Sends back the response

const towTruckService = require('../services/tow-trucks.service');

// ─────────────────────────────────────────────────────────
// 🔴 HIGH PRIORITY
// POST /api/tow-trucks/request
// Customer requests a tow truck
// ─────────────────────────────────────────────────────────
exports.requestTowTruck = async (req, res) => {
  try {
    // Extract data from the request body (what the customer sent)
    const { pickupLocation, dropoffLocation, vehicleDetails, towTruckType, customerPhone } = req.body;

    // req.user comes from the auth middleware (Supuni's code)
    const customerId = req.user.uid;

    // ── Validation: Check all required fields are present ──
    if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location with latitude and longitude is required',
      });
    }

    if (!dropoffLocation || !dropoffLocation.latitude || !dropoffLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Drop-off location with latitude and longitude is required',
      });
    }

    const validTypes = ['flatbed', 'hook-chain', 'wheel-lift'];
    if (!towTruckType || !validTypes.includes(towTruckType)) {
      return res.status(400).json({
        success: false,
        message: `Tow truck type must be one of: ${validTypes.join(', ')}`,
      });
    }

    // ── Call service to save to database ──
    const request = await towTruckService.createTowRequest({
      customerId,
      customerPhone,
      pickupLocation,
      dropoffLocation,
      vehicleDetails,
      towTruckType,
    });

    // ── Send success response ──
    res.status(201).json({
      success: true,
      message: 'Tow truck request created successfully! Looking for available trucks...',
      data: request,
    });
  } catch (error) {
    console.error('Error in requestTowTruck:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Failed to create tow truck request.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────
// 🔴 HIGH PRIORITY
// GET /api/tow-trucks/available
// Get all available tow trucks near customer location
// Supports: ?type=flatbed  (optional filter)
// Requires: ?latitude=6.92&longitude=79.86  (required)
// ─────────────────────────────────────────────────────────
exports.getAvailableTowTrucks = async (req, res) => {
  try {
    // Extract query parameters from the URL
    // Example URL: /available?latitude=6.9271&longitude=79.8612&radius=10&type=flatbed
    const { latitude, longitude, type, radius = 10 } = req.query;

    // ── Validation ──
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Your location is required. Please provide latitude and longitude.',
      });
    }

    // Convert text values from URL to numbers
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const searchRadius = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values.',
      });
    }

    // ── Call service to get trucks from database ──
    const towTrucks = await towTruckService.getAvailableTowTrucks({
      latitude: lat,
      longitude: lon,
      type: type || null, // Pass type filter if provided
      radius: searchRadius,
    });

    // ── Send response ──
    res.status(200).json({
      success: true,
      count: towTrucks.length,
      searchRadius: `${searchRadius} km`,
      message: towTrucks.length === 0 ? 'No tow trucks available in your area right now.' : undefined,
      data: towTrucks,
    });
  } catch (error) {
    console.error('Error in getAvailableTowTrucks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Failed to fetch available tow trucks.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────
// 🟡 MEDIUM PRIORITY
// GET /api/tow-trucks/flatbed
// Get only FLATBED tow trucks (reuses the available logic)
// ─────────────────────────────────────────────────────────
exports.getFlatbedTowTrucks = async (req, res) => {
  // Override the type in query params and reuse the same logic
  req.query.type = 'flatbed';
  return exports.getAvailableTowTrucks(req, res);
};

// ─────────────────────────────────────────────────────────
// 🟡 MEDIUM PRIORITY
// GET /api/tow-trucks/hook-chain
// Get only HOOK & CHAIN tow trucks
// ─────────────────────────────────────────────────────────
exports.getHookChainTowTrucks = async (req, res) => {
  req.query.type = 'hook-chain';
  return exports.getAvailableTowTrucks(req, res);
};

// ─────────────────────────────────────────────────────────
// 🟡 MEDIUM PRIORITY
// GET /api/tow-trucks/wheel-lift
// Get only WHEEL LIFT tow trucks
// ─────────────────────────────────────────────────────────
exports.getWheelLiftTowTrucks = async (req, res) => {
  req.query.type = 'wheel-lift';
  return exports.getAvailableTowTrucks(req, res);
};

// ─────────────────────────────────────────────────────────
// 🟡 MEDIUM PRIORITY
// PUT /api/tow-trucks/accept/:id
// Tow truck driver accepts a pending request
// :id = the request ID from the URL (e.g., /accept/req123)
// ─────────────────────────────────────────────────────────
exports.acceptTowRequest = async (req, res) => {
  try {
    const requestId = req.params.id; // Gets the "id" from the URL
    const towTruckId = req.user.towTruckId; // The logged-in driver's truck ID

    if (!towTruckId) {
      return res.status(403).json({
        success: false,
        message: 'Only tow truck operators can accept requests.',
      });
    }

    // ── Call service to update the database ──
    const updatedRequest = await towTruckService.acceptTowRequest(requestId, towTruckId);

    // TODO: Trigger notification to customer (Nicol's module)

    res.status(200).json({
      success: true,
      message: 'Tow request accepted! The customer has been notified.',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Error in acceptTowRequest:', error.message);

    // Send a specific message if the request was already taken
    if (error.message.includes('already been accepted')) {
      return res.status(409).json({ // 409 = Conflict
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Failed to accept tow request.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────
// 🟢 LOW PRIORITY
// GET /api/tow-trucks/:id
// Get a specific tow truck's profile/details
// ─────────────────────────────────────────────────────────
exports.getTowTruckProfile = async (req, res) => {
  try {
    const towTruckId = req.params.id;

    // ── Call service to get from database ──
    const towTruck = await towTruckService.getTowTruckById(towTruckId);

    // If not found, return 404
    if (!towTruck) {
      return res.status(404).json({
        success: false,
        message: `Tow truck with ID "${towTruckId}" not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: towTruck,
    });
  } catch (error) {
    console.error('Error in getTowTruckProfile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Failed to fetch tow truck profile.',
      error: error.message,
    });
  }
};
