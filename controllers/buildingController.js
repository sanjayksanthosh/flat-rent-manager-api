const Building = require('../models/Building');
exports.getAll = (req, res) => res.json(Building.getAll());
exports.getById = (req, res) => { const b = Building.getById(req.params.id); if (!b) return res.status(404).json({ error: 'Not found' }); res.json(b); };
exports.create = (req, res) => res.status(201).json(Building.create(req.body));
exports.update = (req, res) => res.json(Building.update(Number(req.params.id), req.body));
exports.delete = (req, res) => { Building.delete(Number(req.params.id)); res.json({ success: true }); };
