const Lease = require('../models/Lease');
exports.getAll = (req, res) => res.json(Lease.getAll());
exports.getById = (req, res) => { const l = Lease.getById(req.params.id); if (!l) return res.status(404).json({ error: 'Not found' }); res.json(l); };
exports.getByTenant = (req, res) => res.json(Lease.getByTenant(Number(req.params.tenantId)));
exports.getByFlat = (req, res) => { const l = Lease.getActiveByFlat(Number(req.params.flatId)); if (!l) return res.status(404).json({ error: 'No active lease' }); res.json(l); };
exports.create = (req, res) => res.status(201).json(Lease.create(req.body));
exports.moveOut = (req, res) => res.json(Lease.moveOut(Number(req.params.id), req.body.moveOutDate || new Date().toISOString().split('T')[0]));
exports.delete = (req, res) => { Lease.delete(Number(req.params.id)); res.json({ success: true }); };
