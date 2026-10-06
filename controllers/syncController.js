const { getDb } = require('../config/database');

async function tableSnapshot(table, since) {
  const db = getDb();
  const params = [];
  let sql = 'SELECT * FROM ' + table;
  if (since) {
    sql += ' WHERE "updatedAt" > $1 OR "createdAt" > $1';
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
      buildings: await tableSnapshot('buildings', since),
      flats: await tableSnapshot('flats', since),
      tenants: await tableSnapshot('tenants', since),
      leases: await tableSnapshot('leases', since),
      payments: await tableSnapshot('rent_payments', since),
      at: new Date().toISOString()
    });
  } catch (e) { next(e); }
};