const { getDb } = require('../config/database');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const r = await getDb().query(
      `SELECT u.id, u.username, u.name, u.role
       FROM sessions s JOIN users u ON u.id = s."userId"
       WHERE s.token = $1 AND (s."expiresAt" IS NULL OR s."expiresAt" > $2)`,
      [token, new Date().toISOString()]
    );
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

    req.userId = user.id;
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };