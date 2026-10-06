const RentPayment = require('../models/RentPayment');
exports.getAll = (req, res) => {
  const { month, year, buildingId, status, leaseId } = req.query;
  res.json(RentPayment.getAll({ month: month ? Number(month) : null, year: year ? Number(year) : null, buildingId: buildingId ? Number(buildingId) : null, status, leaseId: leaseId ? Number(leaseId) : null }));
};
exports.getByLease = (req, res) => res.json(RentPayment.getAll({ leaseId: Number(req.params.leaseId) }));
exports.getById = (req, res) => { const p = RentPayment.getById(req.params.id); if (!p) return res.status(404).json({ error: 'Not found' }); res.json(p); };
exports.create = (req, res) => res.status(201).json(RentPayment.create(req.body));
exports.getSummary = (req, res) => res.json(RentPayment.getDueSummary());
exports.getMonthlyReport = (req, res) => {
  const { buildingId, month, year, status, search } = req.query;
  res.json(RentPayment.getMonthlyReport(
    buildingId ? Number(buildingId) : null,
    Number(month),
    Number(year),
    status || 'all',
    search || ''
  ));
};
exports.getLeaseExpiry = (req, res) => res.json(RentPayment.getLeaseExpiryReport(Number(req.query.days) || 30));
exports.getOccupancy = (req, res) => res.json(RentPayment.getOccupancyReport());
