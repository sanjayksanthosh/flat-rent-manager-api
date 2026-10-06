const Tenant = require('../models/Tenant');
exports.getAll = async (req, res, next) => { try { res.json(await Tenant.getAll()); } catch (e) { next(e); } };
exports.getById = async (req, res, next) => { try { const t = await Tenant.getById(req.params.id); if (!t) return res.status(404).json({ error: 'Not found' }); res.json(t); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await Tenant.create(req.body)); } catch (e) { next(e); } };
exports.update = async (req, res, next) => { try { res.json(await Tenant.update(Number(req.params.id), req.body)); } catch (e) { next(e); } };
exports.delete = async (req, res, next) => { try { await Tenant.delete(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); } };