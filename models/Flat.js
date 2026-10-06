const { getDb } = require('../config/database');

const Flat = {
  getAll(buildingId) {
    if (buildingId) {
      return getDb().prepare(`
        SELECT f.*, b.buildingName,
          (SELECT json_object('id', t.id, 'name', t.name, 'phone', t.phone) FROM leases l JOIN tenants t ON t.id = l.tenantId WHERE l.flatId = f.id AND l.moveOutDate IS NULL LIMIT 1) AS tenant
        FROM flats f JOIN buildings b ON b.id = f.buildingId
        WHERE f.buildingId = ? ORDER BY f.flatNumber ASC
      `).all(buildingId);
    }
    return getDb().prepare(`
      SELECT f.*, b.buildingName,
        (SELECT json_object('id', t.id, 'name', t.name, 'phone', t.phone) FROM leases l JOIN tenants t ON t.id = l.tenantId WHERE l.flatId = f.id AND l.moveOutDate IS NULL LIMIT 1) AS tenant
      FROM flats f JOIN buildings b ON b.id = f.buildingId ORDER BY b.buildingName, f.flatNumber
    `).all();
  },
  getById(id) {
    return getDb().prepare(`
      SELECT f.*, b.buildingName,
        (SELECT json_object('id', t.id, 'name', t.name, 'phone', t.phone) FROM leases l JOIN tenants t ON t.id = l.tenantId WHERE l.flatId = f.id AND l.moveOutDate IS NULL LIMIT 1) AS tenant
      FROM flats f JOIN buildings b ON b.id = f.buildingId WHERE f.id = ?
    `).get(id);
  },
  create(data) {
    const stmt = getDb().prepare('INSERT INTO flats (buildingId, flatNumber, floor, monthlyRent, status) VALUES (?, ?, ?, ?, ?)');
    const r = stmt.run(data.buildingId, data.flatNumber, data.floor || '', data.monthlyRent || 0, data.status || 'vacant');
    return Flat.getById(r.lastInsertRowid);
  },
  update(id, data) {
    getDb().prepare('UPDATE flats SET buildingId=?, flatNumber=?, floor=?, monthlyRent=?, status=? WHERE id=?')
      .run(data.buildingId, data.flatNumber, data.floor || '', data.monthlyRent || 0, data.status || 'vacant', id);
    return Flat.getById(id);
  },
  delete(id) {
    getDb().prepare('DELETE FROM flats WHERE id = ?').run(id);
  }
};

module.exports = Flat;
