const { AuthService } = require('../services/AuthService'); // Adjust path as needed
const { logger } = require('../utils');

const authService = new AuthService();

const protect = (req, res, next) => {
  let token;

  // 1. Try to get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If not found, try cookies
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token.' });
  }

  try {
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Not authorized, token failed.' });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Not authorized, token failed.' });
  }
};

module.exports = { protect };
