const Flat = require('../models/Flat');
exports.getAll = async (req, res, next) => { try { res.json(await Flat.getAll(req.query.buildingId ? Number(req.query.buildingId) : null)); } catch (e) { next(e); } };
exports.getByBuilding = async (req, res, next) => { try { res.json(await Flat.getAll(Number(req.params.buildingId))); } catch (e) { next(e); } };
exports.getById = async (req, res, next) => { try { const f = await Flat.getById(req.params.id); if (!f) return res.status(404).json({ error: 'Not found' }); res.json(f); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await Flat.create(req.body)); } catch (e) { next(e); } };
exports.update = async (req, res, next) => { try { res.json(await Flat.update(Number(req.params.id), req.body)); } catch (e) { next(e); } };
exports.delete = async (req, res, next) => { try { await Flat.delete(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); } };