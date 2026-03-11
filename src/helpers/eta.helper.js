// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Calculate ETA in minutes based on distance and average speed
function calculateETA(lat1, lon1, lat2, lon2, speedKmh = 40) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const timeHours = distance / speedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return {
    distanceKm: Math.round(distance * 10) / 10,
    etaMinutes: timeMinutes,
    etaText: `${timeMinutes} mins`
  };
}

module.exports = { calculateDistance, calculateETA };
