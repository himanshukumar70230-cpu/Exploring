const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // For hackathon demo convenience: allow passing role via header `x-user-role: OWNER` or `WORKER`
  const demoRoleHeader = req.headers['x-user-role']?.toUpperCase();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = {
      id: null,
      role: ['OWNER', 'WORKER'].includes(demoRoleHeader) ? demoRoleHeader : 'OWNER',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded; // Contains { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based access control middleware
 * Usage: router.post('/release-funds', requireRole('OWNER'), controllerFn)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toUpperCase();

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole || 'NONE'}`,
      });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };