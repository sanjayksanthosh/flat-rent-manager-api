let db;

const getDb = () => {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    db = new Database(path.join(__dirname, '..', 'data.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS buildings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buildingName TEXT NOT NULL,
        address TEXT DEFAULT '',
        caretakerName TEXT DEFAULT '',
        caretakerPhone TEXT DEFAULT '',
        securityPhone TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS flats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buildingId INTEGER NOT NULL,
        flatNumber TEXT NOT NULL,
        floor TEXT DEFAULT '',
        monthlyRent REAL DEFAULT 0,
        status TEXT DEFAULT 'vacant',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (buildingId) REFERENCES buildings(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        phone2 TEXT DEFAULT '',
        ksebNo TEXT DEFAULT '',
        address TEXT DEFAULT '',
        idProof TEXT DEFAULT '',
        documents TEXT DEFAULT '[]',
        amenities TEXT DEFAULT '[]',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenantId INTEGER NOT NULL,
        flatId INTEGER NOT NULL,
        leaseStart TEXT NOT NULL,
        leaseEnd TEXT NOT NULL,
        monthlyRent REAL DEFAULT 0,
        advanceMonths REAL DEFAULT 0,
        securityDeposit REAL DEFAULT 0,
        moveOutDate TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (flatId) REFERENCES flats(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS rent_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        leaseId INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        amount REAL DEFAULT 0,
        amountPaid REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        paymentDate TEXT NOT NULL,
        paymentMethod TEXT DEFAULT 'Cash',
        status TEXT DEFAULT 'not_paid',
        settled INTEGER DEFAULT 0,
        discount REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leaseId) REFERENCES leases(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paymentId INTEGER NOT NULL,
        leaseId INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        allocatedAmount REAL DEFAULT 0,
        FOREIGN KEY (paymentId) REFERENCES rent_payments(id) ON DELETE CASCADE,
        FOREIGN KEY (leaseId) REFERENCES leases(id) ON DELETE CASCADE
      );
    `);

    const tableCols = {};
    const getCols = (t) => tableCols[t] || (tableCols[t] = db.prepare("PRAGMA table_info(" + t + ")").all().map(c => c.name));
    const addCol = (table, column, decl) => {
      if (!getCols(table).includes(column)) db.exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + decl);
    };
    addCol('tenants', 'documents', "TEXT DEFAULT '[]'");
    addCol('tenants', 'amenities', "TEXT DEFAULT '[]'");
    addCol('tenants', 'phone2', "TEXT DEFAULT ''");
    addCol('tenants', 'ksebNo', "TEXT DEFAULT ''");
    addCol('rent_payments', 'settled', "INTEGER DEFAULT 0");
    addCol('rent_payments', 'discount', "REAL DEFAULT 0");
    ['tenants', 'flats', 'buildings', 'leases', 'rent_payments'].forEach(t => {
      addCol(t, 'createdAt', 'TEXT');
      addCol(t, 'updatedAt', 'TEXT');
      db.exec("UPDATE " + t + " SET createdAt = COALESCE(createdAt, datetime('now')), updatedAt = COALESCE(updatedAt, datetime('now'))");
    });

    console.log('SQLite ready with payment_allocations');
  }
  return db;
};

module.exports = { getDb };
