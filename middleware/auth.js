const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'A Bearer token is required.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'SuperSecretKey123');
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};