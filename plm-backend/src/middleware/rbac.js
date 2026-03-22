/**
 * authorizeRoles — RBAC middleware factory.
 *
 * Usage:
 *   router.post('/eco', verifyJWT, authorizeRoles('ADMIN', 'ENGINEER'), controller.create);
 *
 * Checks req.user.role (set by verifyJWT) against the allowed roles.
 * Returns 403 if the user's role is not in the list.
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied for role: ${req.user?.role || 'unknown'}`,
        data: null,
      });
    }
    next();
  };
};

module.exports = { authorizeRoles };
