const { Pool } = require('pg');
require('dotenv').config();

let pool;
let initPromise;

const getDb = () => {
  if (!pool) {
    if (process.env.DATABASE_URL) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
    } else {
      pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || 'postgres',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
      });
    }
  }
  return pool;
};

const initDb = async () => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const c = await pool.connect();
    const { hashPassword } = require('../utils/auth');
    try {
      await c.query('BEGIN');
      await c.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          name TEXT DEFAULT '',
          "passwordHash" TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          "createdAt" TEXT,
          "expiresAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS buildings (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "buildingName" TEXT NOT NULL,
          address TEXT DEFAULT '',
          area TEXT DEFAULT '',
          "caretakerName" TEXT DEFAULT '',
          "caretakerPhone" TEXT DEFAULT '',
          "securityPhone" TEXT DEFAULT '',
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS flats (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "buildingId" INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          "flatNumber" TEXT NOT NULL,
          floor TEXT DEFAULT '',
          "monthlyRent" DOUBLE PRECISION DEFAULT 0,
          status TEXT DEFAULT 'vacant',
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          phone2 TEXT DEFAULT '',
          "ksebNo" TEXT DEFAULT '',
          address TEXT DEFAULT '',
          "idProof" TEXT DEFAULT '',
          documents TEXT DEFAULT '[]',
          amenities TEXT DEFAULT '[]',
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS leases (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "tenantId" INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          "flatId" INTEGER NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
          "leaseStart" TEXT NOT NULL,
          "leaseEnd" TEXT NOT NULL,
          "monthlyRent" DOUBLE PRECISION DEFAULT 0,
          "advanceMonths" DOUBLE PRECISION DEFAULT 0,
          "securityDeposit" DOUBLE PRECISION DEFAULT 0,
          "moveOutDate" TEXT,
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS rent_payments (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "leaseId" INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          amount DOUBLE PRECISION DEFAULT 0,
          "amountPaid" DOUBLE PRECISION DEFAULT 0,
          balance DOUBLE PRECISION DEFAULT 0,
          "paymentDate" TEXT NOT NULL,
          "paymentMethod" TEXT DEFAULT 'Cash',
          status TEXT DEFAULT 'not_paid',
          settled INTEGER DEFAULT 0,
          discount DOUBLE PRECISION DEFAULT 0,
          "createdAt" TEXT,
          "updatedAt" TEXT
        );
        CREATE TABLE IF NOT EXISTS payment_allocations (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "paymentId" INTEGER NOT NULL REFERENCES rent_payments(id) ON DELETE CASCADE,
          "leaseId" INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          "allocatedAmount" DOUBLE PRECISION DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_buildings_user ON buildings("userId");
        CREATE INDEX IF NOT EXISTS idx_flats_user ON flats("userId");
        CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants("userId");
        CREATE INDEX IF NOT EXISTS idx_leases_user ON leases("userId");
        CREATE INDEX IF NOT EXISTS idx_rent_payments_user ON rent_payments("userId");
      `);
      // Seed default admin (admin / admin123) if no users exist.
      const users = await c.query('SELECT COUNT(*) AS n FROM users');
      if (Number(users.rows[0].n) === 0) {
        const now = new Date().toISOString();
        const ph = hashPassword('admin123');
        await c.query(
          `INSERT INTO users (username, name, "passwordHash", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $5)`,
          ['admin', 'Administrator', ph, 'admin', now]
        );
        console.log('Seeded default admin user (admin / admin123)');
      }
      await c.query('COMMIT');
      console.log('Postgres ready');
    } catch (e) {
      try { await c.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      c.release();
      pool.end();
    }
  })();
  return initPromise;
};

module.exports = { getDb, initDb };