const RentPayment = require('../models/RentPayment');
exports.getAll = async (req, res, next) => {
  try {
    const { month, year, buildingId, status, leaseId } = req.query;
    res.json(await RentPayment.getAll({ month: month ? Number(month) : null, year: year ? Number(year) : null, buildingId: buildingId ? Number(buildingId) : null, status, leaseId: leaseId ? Number(leaseId) : null }));
  } catch (e) { next(e); }
};
exports.getByLease = async (req, res, next) => { try { res.json(await RentPayment.getAll({ leaseId: Number(req.params.leaseId) })); } catch (e) { next(e); } };
exports.getById = async (req, res, next) => { try { const p = await RentPayment.getById(req.params.id); if (!p) return res.status(404).json({ error: 'Not found' }); res.json(p); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await RentPayment.create(req.body)); } catch (e) { next(e); } };
exports.getSummary = async (req, res, next) => { try { res.json(await RentPayment.getDueSummary()); } catch (e) { next(e); } };
exports.getMonthlyReport = async (req, res, next) => {
  try {
    const { buildingId, month, year, status, search } = req.query;
    res.json(await RentPayment.getMonthlyReport(
      buildingId ? Number(buildingId) : null,
      Number(month),
      Number(year),
      status || 'all',
      search || ''
    ));
  } catch (e) { next(e); }
};
exports.getLeaseExpiry = async (req, res, next) => { try { res.json(await RentPayment.getLeaseExpiryReport(Number(req.query.days) || 30)); } catch (e) { next(e); } };
exports.getOccupancy = async (req, res, next) => { try { res.json(await RentPayment.getOccupancyReport()); } catch (e) { next(e); } };