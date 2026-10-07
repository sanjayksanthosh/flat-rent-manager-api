const { getDb } = require('../config/database');

async function tableSnapshot(table, since, userId) {
  const db = getDb();
  const params = [userId];
  let sql = 'SELECT * FROM ' + table + ' WHERE "userId" = $1';
  if (since) {
    sql += ' AND ("updatedAt" > $2 OR "createdAt" > $2)';
    params.push(since);
  }
  sql += ' ORDER BY id';
  const r = await db.query(sql, params);
  return r.rows;
}

exports.pull = async (req, res, next) => {
  try {
    const since = req.query.since || null;
    res.json({
      buildings: await tableSnapshot('buildings', since, req.userId),
      flats: await tableSnapshot('flats', since, req.userId),
      tenants: await tableSnapshot('tenants', since, req.userId),
      leases: await tableSnapshot('leases', since, req.userId),
      payments: await tableSnapshot('rent_payments', since, req.userId),
      at: new Date().toISOString()
    });
  } catch (e) { next(e); }
};