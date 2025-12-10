// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = { id: decoded.id, mobile: decoded.mobile, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const rows = await query(
      'SELECT role FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const role = rows[0].role;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authMiddleware, adminMiddleware };
