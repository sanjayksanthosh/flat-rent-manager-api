const { getDb } = require('../config/database');

const Building = {
  async getAll() {
    const r = await getDb().query('SELECT * FROM buildings ORDER BY "createdAt" DESC');
    return r.rows;
  },
  async getById(id) {
    const r = await getDb().query('SELECT * FROM buildings WHERE id = $1', [id]);
    return r.rows[0] || null;
  },
  async create(data) {
    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO buildings ("buildingName", address, area, "caretakerName", "caretakerPhone", "securityPhone", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', now]
    );
    return r.rows[0];
  },
  async update(id, data) {
    await getDb().query(
      `UPDATE buildings SET "buildingName"=$1, address=$2, area=$3, "caretakerName"=$4, "caretakerPhone"=$5, "securityPhone"=$6, "updatedAt"=$7 WHERE id=$8`,
      [data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', new Date().toISOString(), id]
    );
    return Building.getById(id);
  },
  async delete(id) {
    await getDb().query('DELETE FROM buildings WHERE id = $1', [id]);
  }
};

module.exports = Building;