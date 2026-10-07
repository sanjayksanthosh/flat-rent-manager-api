const { getDb } = require('../config/database');
const { verifyPassword, generateToken } = require('../utils/auth');

const SESSION_TTL_DAYS = 90;

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const r = await getDb().query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = r.rows[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken();
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
    await getDb().query(
      `INSERT INTO sessions ("userId", token, "createdAt", "expiresAt") VALUES ($1, $2, $3, $4)`,
      [user.id, token, now.toISOString(), expires.toISOString()]
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      await getDb().query('DELETE FROM sessions WHERE token = $1', [header.slice(7)]);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

exports.me = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (e) { next(e); }
};