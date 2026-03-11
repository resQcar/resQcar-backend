// src/helpers/eta.helper.js
// Helper function for ETA calculation - GET /api/tracking/eta

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate ETA based on distance and average speed of 40km/h
function calculateETA(lat1, lon1, lat2, lon2) {
  const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);
  const averageSpeedKmh = 40;
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    estimatedMinutes: timeMinutes,
    estimatedText: timeMinutes < 60
      ? `${timeMinutes} minutes`
      : `${Math.floor(timeMinutes / 60)} hr ${timeMinutes % 60} min`
  };
}

module.exports = { calculateETA };
