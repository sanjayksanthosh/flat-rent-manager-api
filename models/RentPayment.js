const { getDb } = require('../config/database');

const RentPayment = {
  async getAll(filters, userId) {
    let sql = `
      SELECT rp.*, l."flatId", l."monthlyRent", l."tenantId", t.name AS "tenantName", f."flatNumber", b."buildingName", b.id AS "buildingId"
      FROM rent_payments rp
      JOIN leases l ON l.id = rp."leaseId" AND l."userId" = $1
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE rp."userId" = $1
    `;
    const params = [userId];
    if (filters.month) { sql += ` AND rp.month = $${params.length + 1}`; params.push(filters.month); }
    if (filters.year) { sql += ` AND rp.year = $${params.length + 1}`; params.push(filters.year); }
    if (filters.buildingId) { sql += ` AND b.id = $${params.length + 1}`; params.push(filters.buildingId); }
    if (filters.status) { sql += ` AND rp.status = $${params.length + 1}`; params.push(filters.status); }
    if (filters.leaseId) { sql += ` AND rp."leaseId" = $${params.length + 1}`; params.push(filters.leaseId); }
    sql += ' ORDER BY rp.year DESC, rp.month DESC';
    const r = await getDb().query(sql, params);
    return r.rows;
  },
  async getById(id, userId) {
    const r = await getDb().query(`
      SELECT rp.*, t.name AS "tenantName", f."flatNumber", b."buildingName"
      FROM rent_payments rp
      JOIN leases l ON l.id = rp."leaseId" AND l."userId" = $1
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE rp.id = $2 AND rp."userId" = $1
    `, [userId, id]);
    return r.rows[0] || null;
  },
  async create(data, userId) {
    const db = getDb();
    const now = new Date().toISOString();
    const discount = data.discount || 0;
    const amount = (data.amount || 0);
    const amountPaid = data.amountPaid || 0;
    const balance = amount - amountPaid;
    let status = 'not_paid';
    if (amountPaid >= amount) status = 'paid';
    else if (amountPaid > 0) status = 'partial';
    const settled = (data.settled || (discount > 0 && amountPaid >= amount)) ? 1 : 0;
    if (settled) status = 'paid';
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO rent_payments ("userId", "leaseId", month, year, amount, "amountPaid", balance, "paymentDate", "paymentMethod", status, settled, discount, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) RETURNING id`,
        [userId, data.leaseId, data.month, data.year, amount, amountPaid, balance, data.paymentDate, data.paymentMethod || 'Cash', status, settled, discount, now]
      );
      const newId = r.rows[0].id;
      await client.query(
        `INSERT INTO payment_allocations ("userId", "paymentId", "leaseId", month, year, "allocatedAmount") VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, newId, data.leaseId, data.month, data.year, amountPaid]
      );
      await client.query('COMMIT');
      return RentPayment.getById(newId, userId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  async getDueSummary(userId) {
    const db = getDb();
    const leasesRes = await db.query(`
      SELECT l.id AS "leaseId", l."monthlyRent", l."advanceMonths", l."leaseStart", l."securityDeposit",
        t.id AS "tenantId", t.name AS "tenantName", t.phone AS "tenantPhone",
        f."flatNumber", b."buildingName", b.id AS "buildingId"
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE l."moveOutDate" IS NULL AND l."userId" = $1
    `, [userId]);
    const activeLeases = leasesRes.rows;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const results = [];
    for (const l of activeLeases) {
      const leaseStart = new Date(l.leaseStart);
      const startMonth = leaseStart.getMonth() + 1;
      const startYear = leaseStart.getFullYear();

      const pmtRes = await db.query(`
        SELECT month, year, "amountPaid", amount, settled, discount FROM rent_payments WHERE "leaseId" = $1 AND "userId" = $2 ORDER BY year, month
      `, [l.leaseId, userId]);
      const payments = pmtRes.rows;

      const monthsBeforeCurrent = (currentYear - startYear) * 12 + (currentMonth - startMonth);
      const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);

      let totalExpected = 0;
      for (let i = 0; i < (monthsBeforeCurrent > 0 ? monthsBeforeCurrent : 0); i++) {
        const m = startMonth + i;
        const y = startYear + Math.floor((startMonth + i - 1) / 12);
        const mm = ((m - 1) % 12) + 1;
        const monthPmts = payments.filter(p => p.month === mm && p.year === y);
        const discounted = monthPmts.find(p => p.discount > 0);
        const settled = monthPmts.filter(p => p.settled);
        let monthDue;
        if (discounted) monthDue = Math.max(0, l.monthlyRent - discounted.discount);
        else if (settled.length > 0) monthDue = settled.reduce((s, p) => s + p.amount, 0);
        else monthDue = l.monthlyRent;
        totalExpected += monthDue;
      }
      const due = totalExpected - totalPaid;

      results.push({
        leaseId: l.leaseId,
        tenantId: l.tenantId,
        tenantName: l.tenantName,
        tenantPhone: l.tenantPhone,
        flatNumber: l.flatNumber,
        buildingName: l.buildingName,
        buildingId: l.buildingId,
        monthlyRent: l.monthlyRent,
        totalExpected,
        totalPaid,
        dueAmount: Math.max(0, due),
        monthsDue: due > 0 ? Math.ceil(due / l.monthlyRent) : 0,
        securityDeposit: l.securityDeposit
      });
    }
    return results;
  },
  async getMonthlyReport(buildingId, month, year, statusFilter, search, userId) {
    const db = getDb();
    let flatsSql = 'SELECT * FROM flats WHERE "userId" = $1';
    const flatsParams = [userId];
    if (buildingId) { flatsSql += ` AND "buildingId" = $${flatsParams.length + 1}`; flatsParams.push(buildingId); }
    flatsSql += ' ORDER BY "flatNumber"';
    const flatsRes = await db.query(flatsSql, flatsParams);
    const flats = flatsRes.rows;

    const results = [];
    for (const flat of flats) {
      const leaseRes = await db.query(`
        SELECT l.*, t.name AS "tenantName", t.phone AS "tenantPhone", t.id AS "tenantId"
        FROM leases l JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
        WHERE l."flatId" = $2 AND l."userId" = $1
        ORDER BY l."leaseStart" DESC
      `, [userId, flat.id]);
      const lease = leaseRes.rows.find(l => {
        if (!l.leaseStart) return false;
        const startParts = l.leaseStart.split('-');
        const startY = parseInt(startParts[0]) || 0;
        const startM = parseInt(startParts[1]) || 0;
        if (startY > year || (startY === year && startM > month)) return false;
        const endStr = l.moveOutDate || l.leaseEnd;
        const endParts = endStr ? endStr.split('-') : [];
        if (endParts.length >= 3) {
          const endY = parseInt(endParts[0]) || 9999;
          const endM = parseInt(endParts[1]) || 9999;
          if (endY < year || (endY === year && endM < month)) return false;
        }
        return true;
      });
      if (!lease) {
        const result = { flatId: flat.id, flatNumber: flat.flatNumber, monthlyRent: flat.monthlyRent, tenantName: null, tenantPhone: null, tenantId: null, leaseId: null, leaseStart: null, leaseEnd: null, daysUntilExpiry: null, status: 'pending', allocatedAmount: 0, outstanding: flat.monthlyRent, paymentId: null };
        if (statusFilter && statusFilter !== 'all' && result.status !== statusFilter) continue;
        if (search) {
          const q = search.toLowerCase();
          if (!result.flatNumber.toLowerCase().includes(q) && (!result.tenantName || !result.tenantName.toLowerCase().includes(q))) continue;
        }
        results.push(result);
        continue;
      }

      let status = 'pending';
      let allocatedAmount = 0;
      let paymentId = null;
      const monthlyRent = (lease && lease.monthlyRent) ? lease.monthlyRent : flat.monthlyRent;
      let outstanding = monthlyRent;

      const allPaymentsRes = await db.query(`
        SELECT id, month, year, "amountPaid", amount, settled, discount FROM rent_payments WHERE "leaseId" = $1 AND "userId" = $2 ORDER BY year, month
      `, [lease.id, userId]);
      const allPayments = allPaymentsRes.rows;

      const monthDueFor = (m, y) => {
        const monthPmts = allPayments.filter(p => p.month === m && p.year === y);
        const discounted = monthPmts.find(p => p.discount > 0);
        if (discounted) return Math.max(0, monthlyRent - discounted.discount);
        const settled = monthPmts.filter(p => p.settled);
        if (settled.length > 0) return settled.reduce((s, p) => s + p.amount, 0);
        return monthlyRent;
      };

      const startParts = lease.leaseStart.split('-');
      const sy = parseInt(startParts[0]) || year;
      const sm = parseInt(startParts[1]) || month;
      let carry = 0;
      let cy = sy, cm = sm;
      while (cy < year || (cy === year && cm < month)) {
        const monthTotal = allPayments
          .filter(p => p.month === cm && p.year === cy)
          .reduce((s, p) => s + p.amountPaid, 0);
        const avail = monthTotal + carry;
        const md = monthDueFor(cm, cy);
        if (avail >= md) carry = avail - md;
        else carry = 0;
        cm++;
        if (cm > 12) { cm = 1; cy++; }
      }

      const curPayments = allPayments.filter(p => p.month === month && p.year === year);
      allocatedAmount = curPayments.reduce((s, p) => s + p.amountPaid, 0);
      if (curPayments.length > 0) paymentId = curPayments[0].id;

      const effectiveAvailable = allocatedAmount + carry;
      const curDue = monthDueFor(month, year);
      if (effectiveAvailable >= curDue) {
        if (carry > 0) {
          status = 'advance_paid';
        } else {
          status = 'paid';
        }
      } else if (allocatedAmount > 0) {
        status = 'partial';
      }
      outstanding = Math.max(0, curDue - effectiveAvailable);

      const result = {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        monthlyRent,
        tenantName: lease ? lease.tenantName : null,
        tenantPhone: lease ? lease.tenantPhone : null,
        tenantId: lease ? lease.tenantId : null,
        leaseId: lease ? lease.id : null,
        leaseStart: lease ? lease.leaseStart : null,
        leaseEnd: lease ? lease.leaseEnd : null,
        daysUntilExpiry: lease ? Math.ceil((new Date(lease.leaseEnd) - new Date()) / (1000 * 60 * 60 * 24)) : null,
        status,
        allocatedAmount,
        outstanding,
        paymentId,
      };

      if (statusFilter && statusFilter !== 'all' && result.status !== statusFilter) continue;
      if (search) {
        const q = search.toLowerCase();
        if (!result.flatNumber.toLowerCase().includes(q) && (!result.tenantName || !result.tenantName.toLowerCase().includes(q))) continue;
      }
      results.push(result);
    }
    return results;
  },
  async getLeaseExpiryReport(days, userId) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const r = await getDb().query(`
      SELECT l.*, t.name AS "tenantName", t.phone AS "tenantPhone", f."flatNumber", b."buildingName"
      FROM leases l
      JOIN tenants t ON t.id = l."tenantId" AND t."userId" = $1
      JOIN flats f ON f.id = l."flatId" AND f."userId" = $1
      JOIN buildings b ON b.id = f."buildingId" AND b."userId" = $1
      WHERE l."moveOutDate" IS NULL AND l."userId" = $1 AND l."leaseEnd" BETWEEN $2 AND $3
      ORDER BY l."leaseEnd"
    `, [userId, new Date().toISOString().split('T')[0], future.toISOString().split('T')[0]]);
    return r.rows;
  },
  async getOccupancyReport(userId) {
    const db = getDb();
    const total = (await db.query('SELECT COUNT(*) AS c FROM flats WHERE "userId" = $1', [userId])).rows[0];
    const occupied = (await db.query("SELECT COUNT(*) AS c FROM flats WHERE status = 'occupied' AND \"userId\" = $1", [userId])).rows[0];
    const vacant = (await db.query("SELECT COUNT(*) AS c FROM flats WHERE status = 'vacant' AND \"userId\" = $1", [userId])).rows[0];
    return { totalFlats: Number(total.c), occupiedFlats: Number(occupied.c), vacantFlats: Number(vacant.c) };
  }
};

module.exports = RentPayment;