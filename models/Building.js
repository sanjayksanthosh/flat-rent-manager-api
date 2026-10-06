const { getDb } = require('../config/database');

const Building = {
  getAll() {
    return getDb().prepare('SELECT * FROM buildings ORDER BY createdAt DESC').all();
  },
  getById(id) {
    return getDb().prepare('SELECT * FROM buildings WHERE id = ?').get(id);
  },
  create(data) {
    const stmt = getDb().prepare('INSERT INTO buildings (buildingName, address, area, caretakerName, caretakerPhone, securityPhone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const r = stmt.run(data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', new Date().toISOString());
    return Building.getById(r.lastInsertRowid);
  },
  update(id, data) {
    getDb().prepare('UPDATE buildings SET buildingName=?, address=?, area=?, caretakerName=?, caretakerPhone=?, securityPhone=? WHERE id=?')
      .run(data.buildingName, data.address || '', data.area || '', data.caretakerName || '', data.caretakerPhone || '', data.securityPhone || '', id);
    return Building.getById(id);
  },
  delete(id) {
    getDb().prepare('DELETE FROM buildings WHERE id = ?').run(id);
  }
};

module.exports = Building;
