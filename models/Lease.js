const { getDb } = require('../config/database');

const Lease = {
  getAll() {
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone, f.flatNumber, b.buildingName, b.id AS buildingId
      FROM leases l
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      ORDER BY l.leaseStart DESC
    `).all();
  },
  getById(id) {
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone, t.address AS tenantAddress, f.flatNumber, b.buildingName, b.id AS buildingId
      FROM leases l
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE l.id = ?
    `).get(id);
  },
  getByTenant(tenantId) {
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, f.flatNumber, b.buildingName
      FROM leases l
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE l.tenantId = ? ORDER BY l.leaseStart DESC
    `).all(tenantId);
  },
  getByFlat(flatId) {
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone
      FROM leases l JOIN tenants t ON t.id = l.tenantId
      WHERE l.flatId = ? AND l.moveOutDate IS NULL
    `).get(flatId);
  },
  getActiveByFlat(flatId) {
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone
      FROM leases l JOIN tenants t ON t.id = l.tenantId
      WHERE l.flatId = ? AND l.moveOutDate IS NULL
    `).get(flatId);
  },
  create(data) {
    const stmt = getDb().prepare('INSERT INTO leases (tenantId, flatId, leaseStart, leaseEnd, monthlyRent, advanceMonths, securityDeposit) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const r = stmt.run(data.tenantId, data.flatId, data.leaseStart, data.leaseEnd, data.monthlyRent || 0, data.advanceMonths || 0, data.securityDeposit || 0);
    getDb().prepare('UPDATE flats SET status = ? WHERE id = ?').run('occupied', data.flatId);
    return Lease.getById(r.lastInsertRowid);
  },
  moveOut(id, moveOutDate) {
    const lease = Lease.getById(id);
    if (lease) {
      getDb().prepare('UPDATE leases SET moveOutDate = ? WHERE id = ?').run(moveOutDate, id);
      getDb().prepare('UPDATE flats SET status = ? WHERE id = ?').run('vacant', lease.flatId);
    }
    return Lease.getById(id);
  },
  delete(id) {
    const lease = Lease.getById(id);
    if (lease) {
      getDb().prepare('UPDATE flats SET status = ? WHERE id = ?').run('vacant', lease.flatId);
    }
    getDb().prepare('DELETE FROM leases WHERE id = ?').run(id);
  }
};

module.exports = Lease;
