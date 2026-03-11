const trackingService = require('../services/tracking.service');
const { calculateETA } = require('../helpers/eta.helper');

// POST /api/tracking/update-location
exports.updateMechanicLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const mechanicId = req.user.uid; // from auth middleware

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    await trackingService.updateLocation(mechanicId, latitude, longitude);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

// GET /api/tracking/mechanic/:id
exports.getLiveLocation = async (req, res) => {
  try {
    const mechanicId = req.params.id;
    const location = await trackingService.getLocation(mechanicId);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found for this mechanic'
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error getting location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location',
      error: error.message
    });
  }
};

// GET /api/tracking/eta
exports.getETA = async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        success: false,
        message: 'lat1, lon1, lat2, lon2 are all required'
      });
    }

    const eta = calculateETA(
      parseFloat(lat1), parseFloat(lon1),
      parseFloat(lat2), parseFloat(lon2)
    );

    res.status(200).json({
      success: true,
      data: eta
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate ETA',
      error: error.message
    });
  }
};
