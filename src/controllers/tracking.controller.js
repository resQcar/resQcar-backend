const trackingService = require('../services/tracking.service');

// POST /api/tracking/update-location
exports.updateMechanicLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const mechanicId = req.user.uid;

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