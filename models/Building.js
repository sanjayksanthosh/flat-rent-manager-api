const { getDb } = require('../config/database');

const Building = {
  async getAll(userId) {
    const r = await getDb().query('SELECT * FROM buildings WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return r.rows;
  },
  async getById(id, userId) {
    const r = await getDb().query('SELECT * FROM buildings WHERE id = $1 AND "userId" = $2', [id, userId]);
    return r.rows[0] || null;
  },
  async create(data, userId) {
    const now = new Date().toISOString();
    const r = await getDb().query(
      `INSERT INTO buildings ("userId", "buildingName", address, area, "caretakerName", "caretakerPhone", "securityPhone", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
      [userId, data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', now]
    );
    return r.rows[0];
  },
  async update(id, data, userId) {
    await getDb().query(
      `UPDATE buildings SET "buildingName"=$1, address=$2, area=$3, "caretakerName"=$4, "caretakerPhone"=$5, "securityPhone"=$6, "updatedAt"=$7 WHERE id=$8 AND "userId"=$9`,
      [data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', new Date().toISOString(), id, userId]
    );
    return Building.getById(id, userId);
  },
  async delete(id, userId) {
    await getDb().query('DELETE FROM buildings WHERE id = $1 AND "userId" = $2', [id, userId]);
  }
};

module.exports = Building;