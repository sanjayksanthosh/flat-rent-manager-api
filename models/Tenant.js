const { getDb } = require('../config/database');

const leasesSubquery = `
  COALESCE(
    (SELECT json_agg(json_build_object('id', l.id, 'flatId', l."flatId", 'flatNumber', f."flatNumber", 'buildingName', b."buildingName", 'leaseStart', l."leaseStart", 'leaseEnd', l."leaseEnd", 'monthlyRent', l."monthlyRent", 'advanceMonths', l."advanceMonths", 'securityDeposit', l."securityDeposit", 'moveOutDate', l."moveOutDate") ORDER BY l."leaseStart" DESC)
     FROM leases l LEFT JOIN flats f ON f.id = l."flatId" LEFT JOIN buildings b ON b.id = f."buildingId" WHERE l."tenantId" = t.id),
    '[]'::json
  ) AS leases`;

const Tenant = {
  async getAll(userId) {
    const r = await getDb().query(`
      SELECT t.*, ${leasesSubquery}
      FROM tenants t WHERE t."userId" = $1 ORDER BY t.name
    `, [userId]);
    return r.rows.map(row => ({
      ...row,
      documents: JSON.parse(row.documents || '[]'),
      amenities: JSON.parse(row.amenities || '[]'),
    }));
  },
  async getById(id, userId) {
    const r = await getDb().query(`
      SELECT t.*, ${leasesSubquery}
      FROM tenants t WHERE t.id = $1 AND t."userId" = $2
    `, [id, userId]);
    if (!r.rows[0]) return null;
    return {
      ...r.rows[0],
      documents: JSON.parse(r.rows[0].documents || '[]'),
      amenities: JSON.parse(r.rows[0].amenities || '[]'),
    };
  },
  async create(data, userId) {
    const now = new Date().toISOString();
    const documents = JSON.stringify(data.documents || []);
    const amenities = JSON.stringify(data.amenities || []);
    const r = await getDb().query(
      `INSERT INTO tenants ("userId", name, phone, phone2, "ksebNo", address, "idProof", documents, amenities, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING id`,
      [userId, data.name, data.phone, data.phone2 || '', data.ksebNo || '', data.address || '', data.idProof || '', documents, amenities, now]
    );
    return Tenant.getById(r.rows[0].id, userId);
  },
  async update(id, data, userId) {
    const documents = JSON.stringify(data.documents || []);
    const amenities = JSON.stringify(data.amenities || []);
    await getDb().query(
      `UPDATE tenants SET name=$1, phone=$2, phone2=$3, "ksebNo"=$4, address=$5, "idProof"=$6, documents=$7, amenities=$8, "updatedAt"=$9 WHERE id=$10 AND "userId"=$11`,
      [data.name, data.phone, data.phone2 || '', data.ksebNo || '', data.address || '', data.idProof || '', documents, amenities, new Date().toISOString(), id, userId]
    );
    return Tenant.getById(id, userId);
  },
  async delete(id, userId) {
    await getDb().query('DELETE FROM tenants WHERE id = $1 AND "userId" = $2', [id, userId]);
  }
};

module.exports = Tenant;