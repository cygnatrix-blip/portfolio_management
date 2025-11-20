const jwt = require('jsonwebtoken');

/**
 * @desc Protect routes, validate token, and attach user to request
 */
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Get token from header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3. --- NEW "SYSTEM B" LOGIC ---
      // The payload now contains the full 'user' object
      req.user = decoded.user; // <-- ATTACH USER OBJECT (includes id, role, email, name)

      // 4. Check if token is valid
      if (!req.user) {
        return res.status(401).json({ msg: 'Not authorized, token is missing user data' });
      }
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ msg: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'Not authorized, no token' });
  }
};

/**
 * @desc Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Not authorized as an admin' });
    }
};

/**
 * @desc Middleware to check if user is an investor
 */
const isInvestor = (req, res, next) => {
    if (req.user && req.user.role === 'investor') {
        next();
    } else {
        res.status(403).json({ msg: 'Not authorized as an investor' });
    }
};

module.exports = { protect, isAdmin, isInvestor };