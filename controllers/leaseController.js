const Lease = require('../models/Lease');
exports.getAll = async (req, res, next) => { try { res.json(await Lease.getAll()); } catch (e) { next(e); } };
exports.getById = async (req, res, next) => { try { const l = await Lease.getById(req.params.id); if (!l) return res.status(404).json({ error: 'Not found' }); res.json(l); } catch (e) { next(e); } };
exports.getByTenant = async (req, res, next) => { try { res.json(await Lease.getByTenant(Number(req.params.tenantId))); } catch (e) { next(e); } };
exports.getByFlat = async (req, res, next) => { try { const l = await Lease.getActiveByFlat(Number(req.params.flatId)); if (!l) return res.status(404).json({ error: 'No active lease' }); res.json(l); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await Lease.create(req.body)); } catch (e) { next(e); } };
exports.moveOut = async (req, res, next) => { try { res.json(await Lease.moveOut(Number(req.params.id), req.body.moveOutDate || new Date().toISOString().split('T')[0])); } catch (e) { next(e); } };
exports.delete = async (req, res, next) => { try { await Lease.delete(Number(req.params.id)); res.json({ success: true }); } catch (e) { next(e); } };