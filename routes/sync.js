const express = require('express');
const router = express.Router();
const c = require('../controllers/syncController');
const { requireAuth } = require('../middleware/auth');

function healthOrAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ') || !header.slice(7)) {
    return res.status(200).json({ ok: true });
  }
  requireAuth(req, res, next);
}

router.get('/pull', healthOrAuth, c.pull);
module.exports = router;