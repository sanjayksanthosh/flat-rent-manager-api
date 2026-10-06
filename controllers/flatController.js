const Flat = require('../models/Flat');
exports.getAll = (req, res) => res.json(Flat.getAll(req.query.buildingId ? Number(req.query.buildingId) : null));
exports.getByBuilding = (req, res) => res.json(Flat.getAll(Number(req.params.buildingId)));
exports.getById = (req, res) => { const f = Flat.getById(req.params.id); if (!f) return res.status(404).json({ error: 'Not found' }); res.json(f); };
exports.create = (req, res) => res.status(201).json(Flat.create(req.body));
exports.update = (req, res) => res.json(Flat.update(Number(req.params.id), req.body));
exports.delete = (req, res) => { Flat.delete(Number(req.params.id)); res.json({ success: true }); };
