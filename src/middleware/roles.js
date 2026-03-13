// src/middleware/roles.js
// =====================================================
// Role-Based Access Control Middleware
// =====================================================

/**
 * Restrict access to users with a specific role.
 * Roles are stored as Firebase custom claims (set via selectUserType endpoint).
 *
 * Usage: router.put('/route', requireAuth, requireRole('mechanic'), controller.fn)
 * @param {...string} allowedRoles - e.g. requireRole('mechanic') or requireRole('customer', 'admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userType = req.user?.userType ?? null;

    if (!userType) {
      return res.status(403).json({
        message: 'Access denied. No user role found. Please select your user type first.',
      });
    }

    if (!allowedRoles.includes(userType)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${allowedRoles.join(' or ')}. Your role: ${userType}`,
      });
    }

    next();
  };
}

module.exports = { requireRole };
