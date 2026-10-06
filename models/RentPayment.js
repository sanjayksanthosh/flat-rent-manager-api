const { getDb } = require('../config/database');

const RentPayment = {
  getAll(filters) {
    let sql = `
      SELECT rp.*, l.flatId, l.monthlyRent, l.tenantId, t.name AS tenantName, f.flatNumber, b.buildingName, b.id AS buildingId
      FROM rent_payments rp
      JOIN leases l ON l.id = rp.leaseId
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE 1=1
    `;
    const params = [];
    if (filters.month) { sql += ' AND rp.month = ?'; params.push(filters.month); }
    if (filters.year) { sql += ' AND rp.year = ?'; params.push(filters.year); }
    if (filters.buildingId) { sql += ' AND b.id = ?'; params.push(filters.buildingId); }
    if (filters.status) { sql += ' AND rp.status = ?'; params.push(filters.status); }
    if (filters.leaseId) { sql += ' AND rp.leaseId = ?'; params.push(filters.leaseId); }
    sql += ' ORDER BY rp.year DESC, rp.month DESC';
    return getDb().prepare(sql).all(...params);
  },
  getById(id) {
    return getDb().prepare(`
      SELECT rp.*, t.name AS tenantName, f.flatNumber, b.buildingName
      FROM rent_payments rp
      JOIN leases l ON l.id = rp.leaseId
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE rp.id = ?
    `).get(id);
  },
  create(data) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO rent_payments (leaseId, month, year, amount, amountPaid, balance, paymentDate, paymentMethod, status, settled, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const discount = data.discount || 0;
    const amount = (data.amount || 0);
    const amountPaid = data.amountPaid || 0;
    const balance = amount - amountPaid;
    let status = 'not_paid';
    if (amountPaid >= amount) status = 'paid';
    else if (amountPaid > 0) status = 'partial';
    const settled = (data.settled || (discount > 0 && amountPaid >= amount)) ? 1 : 0;
    if (settled) status = 'paid';
    const r = stmt.run(data.leaseId, data.month, data.year, amount, amountPaid, balance, data.paymentDate, data.paymentMethod || 'Cash', status, settled, discount);
    const newPmt = RentPayment.getById(r.lastInsertRowid);

    // Create allocation for this payment
    db.prepare('INSERT INTO payment_allocations (paymentId, leaseId, month, year, allocatedAmount) VALUES (?, ?, ?, ?, ?)')
      .run(r.lastInsertRowid, data.leaseId, data.month, data.year, amountPaid);

    return newPmt;
  },
  getDueSummary() {
    const db = getDb();
    const activeLeases = db.prepare(`
      SELECT l.id AS leaseId, l.monthlyRent, l.advanceMonths, l.leaseStart, l.securityDeposit,
        t.id AS tenantId, t.name AS tenantName, t.phone AS tenantPhone,
        f.flatNumber, b.buildingName, b.id AS buildingId
      FROM leases l
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE l.moveOutDate IS NULL
    `).all();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return activeLeases.map(l => {
      const leaseStart = new Date(l.leaseStart);
      const startMonth = leaseStart.getMonth() + 1;
      const startYear = leaseStart.getFullYear();

      const payments = db.prepare(`
        SELECT month, year, amountPaid, amount, settled, discount FROM rent_payments WHERE leaseId = ? ORDER BY year, month
      `).all(l.leaseId);

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

      return {
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
      };
    });
  },
  getMonthlyReport(buildingId, month, year, statusFilter, search) {
    const db = getDb();
    let flatsSql = 'SELECT * FROM flats WHERE 1=1';
    const flatsParams = [];
    if (buildingId) { flatsSql += ' AND buildingId = ?'; flatsParams.push(buildingId); }
    flatsSql += ' ORDER BY flatNumber';
    const flats = db.prepare(flatsSql).all(...flatsParams);

    return flats.map(flat => {
      // Find lease active during the selected month (not just currently active)
      const lease = db.prepare(`
        SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone, t.id AS tenantId
        FROM leases l JOIN tenants t ON t.id = l.tenantId
        WHERE l.flatId = ?
        ORDER BY l.leaseStart DESC
      `).all(flat.id).find(l => {
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

      let status = 'pending';
      let allocatedAmount = 0;
      let paymentId = null;
      const monthlyRent = (lease && lease.monthlyRent) ? lease.monthlyRent : flat.monthlyRent;
      let outstanding = monthlyRent;

      if (lease) {
        // Get all payments for this lease
        const allPayments = db.prepare(`
          SELECT id, month, year, amountPaid, amount, settled, discount FROM rent_payments WHERE leaseId = ? ORDER BY year, month
        `).all(lease.id);

        // Month due: monthlyRent minus that month's discount; fallback to settled payment amount
        const monthDueFor = (m, y) => {
          const monthPmts = allPayments.filter(p => p.month === m && p.year === y);
          const discounted = monthPmts.find(p => p.discount > 0);
          if (discounted) return Math.max(0, monthlyRent - discounted.discount);
          const settled = monthPmts.filter(p => p.settled);
          if (settled.length > 0) return settled.reduce((s, p) => s + p.amount, 0);
          return monthlyRent;
        };

        // Compute carry-forward before this month
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

        // Check allocation for this month/year
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
      }

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

      if (statusFilter && statusFilter !== 'all' && result.status !== statusFilter) return null;
      if (search) {
        const q = search.toLowerCase();
        if (!result.flatNumber.toLowerCase().includes(q) && (!result.tenantName || !result.tenantName.toLowerCase().includes(q))) return null;
      }
      return result;
    }).filter(r => r !== null);
  },
  getLeaseExpiryReport(days) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return getDb().prepare(`
      SELECT l.*, t.name AS tenantName, t.phone AS tenantPhone, f.flatNumber, b.buildingName
      FROM leases l
      JOIN tenants t ON t.id = l.tenantId
      JOIN flats f ON f.id = l.flatId
      JOIN buildings b ON b.id = f.buildingId
      WHERE l.moveOutDate IS NULL AND l.leaseEnd BETWEEN ? AND ?
      ORDER BY l.leaseEnd
    `).all(new Date().toISOString().split('T')[0], future.toISOString().split('T')[0]);
  },
  getOccupancyReport() {
    const total = getDb().prepare('SELECT COUNT(*) AS c FROM flats').get();
    const occupied = getDb().prepare("SELECT COUNT(*) AS c FROM flats WHERE status = 'occupied'").get();
    const vacant = getDb().prepare("SELECT COUNT(*) AS c FROM flats WHERE status = 'vacant'").get();
    return { totalFlats: total.c, occupiedFlats: occupied.c, vacantFlats: vacant.c };
  }
};

module.exports = RentPayment;
