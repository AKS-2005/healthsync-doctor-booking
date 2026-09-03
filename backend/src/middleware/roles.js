/**
 * Role-based Authorization Middleware
 * Supports single or multiple roles (e.g. requireRole('ADMIN'), requireRole('DOCTOR', 'ADMIN'))
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] role(s). Your role is '${req.user.role}'.`
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
};
