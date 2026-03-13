// src/services/geo.service.js
// =====================================================
// Geo / Location Utilities
// =====================================================

/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * @param {{ lat: number, lng: number }} a - Point A
 * @param {{ lat: number, lng: number }} b - Point B
 * @returns {number} Distance in kilometers
 */
function distanceKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

module.exports = { distanceKm };
