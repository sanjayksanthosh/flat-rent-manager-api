const { getDb } = require('../config/database');

function tableSnapshot(table, since) {
  const db = getDb();
  const sql = since ? 'SELECT * FROM ' + table + ' WHERE updatedAt > ? OR createdAt > ? ORDER BY id' : 'SELECT * FROM ' + table + ' ORDER BY id';
  const params = since ? [since, since] : [];
  return db.prepare(sql).all(...params);
}

exports.pull = (req, res) => {
  const since = req.query.since || null;
  res.json({
    buildings: tableSnapshot('buildings', since),
    flats: tableSnapshot('flats', since),
    tenants: tableSnapshot('tenants', since),
    leases: tableSnapshot('leases', since),
    payments: tableSnapshot('rent_payments', since),
    at: new Date().toISOString()
  });
};
