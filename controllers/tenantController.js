const Tenant = require('../models/Tenant');
exports.getAll = (req, res) => res.json(Tenant.getAll());
exports.getById = (req, res) => { const t = Tenant.getById(req.params.id); if (!t) return res.status(404).json({ error: 'Not found' }); res.json(t); };
exports.create = (req, res) => res.status(201).json(Tenant.create(req.body));
exports.update = (req, res) => res.json(Tenant.update(Number(req.params.id), req.body));
exports.delete = (req, res) => { Tenant.delete(Number(req.params.id)); res.json({ success: true }); };
