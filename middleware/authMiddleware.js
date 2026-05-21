const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT protect middleware.
 * Uses DynamoDB User.findById — no Mongoose dependency.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travel_planner_fallback_secret_key_2026');
    // findById returns user without password
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
