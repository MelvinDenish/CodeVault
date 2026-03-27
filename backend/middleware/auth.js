const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth - sets req.user if token present, but doesn't block
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, jwtSecret);
    } catch (err) {
      // Token invalid, continue without user
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
