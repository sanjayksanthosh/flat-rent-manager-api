const { getDb } = require('../config/database');

const leaseSelect = `
  l.*, t.name AS "tenantName", t.phone AS "tenantPhone", f."flatNumber", b."buildingName", b.id AS "buildingId"
`;

const Lease = {
  async getAll() {
    const r = await getDb().query(`
      SELECT ${leaseSelect}
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId"
      JOIN flats f ON f.id = l."flatId"
      JOIN buildings b ON b.id = f."buildingId"
      ORDER BY l."leaseStart" DESC
    `);
    return r.rows;
  },
  async getById(id) {
    const r = await getDb().query(`
      SELECT ${leaseSelect}, t.address AS "tenantAddress"
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId"
      JOIN flats f ON f.id = l."flatId"
      JOIN buildings b ON b.id = f."buildingId"
      WHERE l.id = $1
    `, [id]);
    return r.rows[0] || null;
  },
  async getByTenant(tenantId) {
    const r = await getDb().query(`
      SELECT ${leaseSelect}
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId"
      JOIN flats f ON f.id = l."flatId"
      JOIN buildings b ON b.id = f."buildingId"
      WHERE l."tenantId" = $1 ORDER BY l."leaseStart" DESC
    `, [tenantId]);
    return r.rows;
  },
  async getByFlat(flatId) {
    const r = await getDb().query(`
      SELECT l.*, t.name AS "tenantName", t.phone AS "tenantPhone"
      FROM leases l JOIN tenants t ON t.id = l."tenantId"
      WHERE l."flatId" = $1 AND l."moveOutDate" IS NULL
    `, [flatId]);
    return r.rows[0] || null;
  },
  getActiveByFlat(flatId) {
    return Lease.getByFlat(flatId);
  },
  async create(data) {
    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO leases ("tenantId", "flatId", "leaseStart", "leaseEnd", "monthlyRent", "advanceMonths", "securityDeposit", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
      [data.tenantId, data.flatId, data.leaseStart, data.leaseEnd, data.monthlyRent || 0, data.advanceMonths || 0, data.securityDeposit || 0, now]
    );
    await getDb().query('UPDATE flats SET status = $1, "updatedAt" = $2 WHERE id = $3', ['occupied', now, data.flatId]);
    return Lease.getById(r.rows[0].id);
  },
  async moveOut(id, moveOutDate) {
    const lease = await Lease.getById(id);
    if (lease) {
      await getDb().query('UPDATE leases SET "moveOutDate" = $1 WHERE id = $2', [moveOutDate, id]);
      await getDb().query('UPDATE flats SET status = $1 WHERE id = $2', ['vacant', lease.flatId]);
    }
    return Lease.getById(id);
  },
  async delete(id) {
    const lease = await Lease.getById(id);
    if (lease) {
      await getDb().query('UPDATE flats SET status = $1 WHERE id = $2', ['vacant', lease.flatId]);
    }
    await getDb().query('DELETE FROM leases WHERE id = $1', [id]);
  }
};

module.exports = Lease;