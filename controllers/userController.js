const { getDb } = require('../config/database');
const { hashPassword, generateToken } = require('../utils/auth');

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name || '',
  role: u.role,
  createdAt: u.createdAt
});

exports.list = async (req, res, next) => {
  try {
    const r = await getDb().query('SELECT id, username, name, role, "createdAt" FROM users ORDER BY id');
    res.json(r.rows.map(publicUser));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { username, name, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (role !== 'user' && role !== 'admin') return res.status(400).json({ error: 'Invalid role' });

    const exists = await getDb().query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });

    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO users (username, name, "passwordHash", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING id, username, name, role, "createdAt"`,
      [username, name || '', hashPassword(password), role, now]
    );
    res.status(201).json(publicUser(r.rows[0]));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, role, password } = req.body || {};
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    const target = await getDb().query('SELECT * FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const sets = [];
    const params = [];
    const push = (field, value) => { params.push(value); sets.push(`"${field}" = $${params.length}`); };

    if (typeof name === 'string') push('name', name);
    if (role === 'user' || role === 'admin') push('role', role);
    if (password) push('passwordHash', hashPassword(password));
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    push('updatedAt', new Date().toISOString());
    params.push(id);
    await getDb().query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const r = await getDb().query('SELECT id, username, name, role, "createdAt" FROM users WHERE id = $1', [id]);
    res.json(publicUser(r.rows[0]));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    if (id === req.userId) return res.status(400).json({ error: 'Cannot delete your own account' });

    const r = await getDb().query('DELETE FROM users WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (e) { next(e); }
};

// Login as a managed user (admin impersonation, used in dev/onboarding).
exports.createSession = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await getDb().query('SELECT * FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = target.rows[0];

    const token = generateToken();
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 90);
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