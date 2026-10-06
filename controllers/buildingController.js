const Building = require('../models/Building');
exports.getAll = async (req, res, next) => { try { res.json(await Building.getAll()); } catch (e) { next(e); } };
exports.getById = async (req, res, next) => { try { const b = await Building.getById(req.params.id); if (!b) return res.status(404).json({ error: 'Not found' }); res.json(b); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await Building.create(req.body)); } catch (e) { next(e); } };
exports.update = async (req, res, next) => { try { res.json(await Building.update(Number(req.params.id), req.body)); } catch (e) { next(e); } };
exports.delete = async (req, res, next) => { try { await Building.delete(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); } };