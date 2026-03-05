const authenticate = (req, res, next) => {
  // Temporary fake user for testing
  req.user = {
    uid: 'test-user-123',
    towTruckId: 'test-truck-123'
  };
  next();
};

module.exports = { authenticate };
