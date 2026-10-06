const { getDb } = require('../config/database');

const Tenant = {
  getAll() {
    return getDb().prepare(`
      SELECT t.*,
        (SELECT json_group_array(json_object('id', l.id, 'flatId', l.flatId, 'flatNumber', f.flatNumber, 'buildingName', b.buildingName, 'leaseStart', l.leaseStart, 'leaseEnd', l.leaseEnd, 'monthlyRent', l.monthlyRent, 'advanceMonths', l.advanceMonths, 'securityDeposit', l.securityDeposit, 'moveOutDate', l.moveOutDate))
         FROM leases l LEFT JOIN flats f ON f.id = l.flatId LEFT JOIN buildings b ON b.id = f.buildingId WHERE l.tenantId = t.id) AS leases
      FROM tenants t ORDER BY t.name
    `).all().map(r => ({
      ...r,
      documents: JSON.parse(r.documents || '[]'),
      amenities: JSON.parse(r.amenities || '[]'),
      leases: JSON.parse(r.leases || '[]'),
    }));
  },
  getById(id) {
    const r = getDb().prepare(`
      SELECT t.*,
        (SELECT json_group_array(json_object('id', l.id, 'flatId', l.flatId, 'flatNumber', f.flatNumber, 'buildingName', b.buildingName, 'leaseStart', l.leaseStart, 'leaseEnd', l.leaseEnd, 'monthlyRent', l.monthlyRent, 'advanceMonths', l.advanceMonths, 'securityDeposit', l.securityDeposit, 'moveOutDate', l.moveOutDate))
         FROM leases l LEFT JOIN flats f ON f.id = l.flatId LEFT JOIN buildings b ON b.id = f.buildingId WHERE l.tenantId = t.id) AS leases
      FROM tenants t WHERE t.id = ?
    `).get(id);
    if (r) {
      r.documents = JSON.parse(r.documents || '[]');
      r.amenities = JSON.parse(r.amenities || '[]');
      r.leases = JSON.parse(r.leases || '[]');
    }
    return r;
  },
  create(data) {
    const db = getDb();
    const documents = JSON.stringify(data.documents || []);
    const amenities = JSON.stringify(data.amenities || []);
    const stmt = db.prepare('INSERT INTO tenants (name, phone, phone2, ksebNo, address, idProof, documents, amenities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const r = stmt.run(data.name, data.phone, data.phone2 || '', data.ksebNo || '', data.address || '', data.idProof || '', documents, amenities);
    return Tenant.getById(r.lastInsertRowid);
  },
  update(id, data) {
    const db = getDb();
    const documents = JSON.stringify(data.documents || []);
    const amenities = JSON.stringify(data.amenities || []);
    db.prepare('UPDATE tenants SET name=?, phone=?, phone2=?, ksebNo=?, address=?, idProof=?, documents=?, amenities=? WHERE id=?')
      .run(data.name, data.phone, data.phone2 || '', data.ksebNo || '', data.address || '', data.idProof || '', documents, amenities, id);
    return Tenant.getById(id);
  },
  delete(id) {
    getDb().prepare('DELETE FROM tenants WHERE id = ?').run(id);
  }
};

module.exports = Tenant;
