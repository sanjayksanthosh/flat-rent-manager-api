const { getDb } = require('../config/database');

const tenantSubquery = `
  (SELECT json_build_object('id', t.id, 'name', t.name, 'phone', t.phone)
   FROM leases l JOIN tenants t ON t.id = l."tenantId"
   WHERE l."flatId" = f.id AND l."moveOutDate" IS NULL LIMIT 1) AS tenant`;

const Flat = {
  async getAll(buildingId) {
    if (buildingId) {
      const r = await getDb().query(`
        SELECT f.*, b."buildingName", ${tenantSubquery}
        FROM flats f JOIN buildings b ON b.id = f."buildingId"
        WHERE f."buildingId" = $1 ORDER BY f."flatNumber" ASC
      `, [buildingId]);
      return r.rows;
    }
    const r = await getDb().query(`
      SELECT f.*, b."buildingName", ${tenantSubquery}
      FROM flats f JOIN buildings b ON b.id = f."buildingId"
      ORDER BY b."buildingName", f."flatNumber"
    `);
    return r.rows;
  },
  async getById(id) {
    const r = await getDb().query(`
      SELECT f.*, b."buildingName", ${tenantSubquery}
      FROM flats f JOIN buildings b ON b.id = f."buildingId" WHERE f.id = $1
    `, [id]);
    return r.rows[0] || null;
  },
  async create(data) {
    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO flats ("buildingId", "flatNumber", floor, "monthlyRent", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
      [data.buildingId, data.flatNumber, data.floor || '', data.monthlyRent || 0, data.status || 'vacant', now]
    );
    return Flat.getById(r.rows[0].id);
  },
  async update(id, data) {
    await getDb().query(
      `UPDATE flats SET "buildingId"=$1, "flatNumber"=$2, floor=$3, "monthlyRent"=$4, status=$5, "updatedAt"=$6 WHERE id=$7`,
      [data.buildingId, data.flatNumber, data.floor || '', data.monthlyRent || 0, data.status || 'vacant', new Date().toISOString(), id]
    );
    return Flat.getById(id);
  },
  async delete(id) {
    await getDb().query('DELETE FROM flats WHERE id = $1', [id]);
  }
};

module.exports = Flat;