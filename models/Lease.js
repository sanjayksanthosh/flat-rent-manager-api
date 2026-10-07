const { getDb } = require('../config/database');

const leaseSelect = `
  l.*, t.name AS "tenantName", t.phone AS "tenantPhone", f."flatNumber", b."buildingName", b.id AS "buildingId"
`;

const Lease = {
  async getAll(userId) {
    const r = await getDb().query(`
      SELECT ${leaseSelect}
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE l."userId" = $1
      ORDER BY l."leaseStart" DESC
    `, [userId]);
    return r.rows;
  },
  async getById(id, userId) {
    const r = await getDb().query(`
      SELECT ${leaseSelect}, t.address AS "tenantAddress"
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE l.id = $2 AND l."userId" = $1
    `, [userId, id]);
    return r.rows[0] || null;
  },
  async getByTenant(tenantId, userId) {
    const r = await getDb().query(`
      SELECT ${leaseSelect}
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE l."tenantId" = $2 AND l."userId" = $1 ORDER BY l."leaseStart" DESC
    `, [userId, tenantId]);
    return r.rows;
  },
  async getByFlat(flatId, userId) {
    const r = await getDb().query(`
      SELECT l.*, t.name AS "tenantName", t.phone AS "tenantPhone"
      FROM leases l JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      WHERE l."flatId" = $2 AND l."moveOutDate" IS NULL AND l."userId" = $1
    `, [userId, flatId]);
    return r.rows[0] || null;
  },
  async getActiveByFlat(flatId, userId) {
    return Lease.getByFlat(flatId, userId);
  },
  async create(data, userId) {
    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO leases ("userId", "tenantId", "flatId", "leaseStart", "leaseEnd", "monthlyRent", "advanceMonths", "securityDeposit", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
      [userId, data.tenantId, data.flatId, data.leaseStart, data.leaseEnd, data.monthlyRent || 0, data.advanceMonths || 0, data.securityDeposit || 0, now]
    );
    await getDb().query('UPDATE flats SET status = $1, "updatedAt" = $2 WHERE id = $3 AND "userId" = $4', ['occupied', now, data.flatId, userId]);
    return Lease.getById(r.rows[0].id, userId);
  },
  async moveOut(id, moveOutDate, userId) {
    const lease = await Lease.getById(id, userId);
    if (lease) {
      await getDb().query('UPDATE leases SET "moveOutDate" = $1 WHERE id = $2 AND "userId" = $3', [moveOutDate, id, userId]);
      await getDb().query('UPDATE flats SET status = $1 WHERE id = $2 AND "userId" = $3', ['vacant', lease.flatId, userId]);
    }
    return Lease.getById(id, userId);
  },
  async delete(id, userId) {
    const lease = await Lease.getById(id, userId);
    if (lease) {
      await getDb().query('UPDATE flats SET status = $1 WHERE id = $2 AND "userId" = $3', ['vacant', lease.flatId, userId]);
    }
    await getDb().query('DELETE FROM leases WHERE id = $1 AND "userId" = $2', [id, userId]);
  }
};

module.exports = Lease;