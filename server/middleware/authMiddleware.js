const jwt = require('jsonwebtoken');
// We no longer need require('dotenv').config() here, as it's now handled globally in index.js

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // --- THIS IS THE DEBUGGING LINE ---
      // It will show us exactly what secret is being used.
      console.log('Verifying token with secret:', process.env.JWT_SECRET);

      // Verify token using your secret key from the .env file
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.client = decoded.client;
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

const isAdmin = (req, res, next) => {
    if (req.client && req.client.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Not authorized as an admin' });
    }
};

module.exports = { protect, isAdmin };

