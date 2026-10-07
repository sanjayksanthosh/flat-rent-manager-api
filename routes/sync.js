const express = require('express');
const router = express.Router();
const c = require('../controllers/syncController');
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);
router.get('/pull', c.pull);
module.exports = router;