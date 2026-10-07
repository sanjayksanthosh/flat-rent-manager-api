const express = require('express');
const router = express.Router();
const c = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
router.use(requireAuth);
router.get('/', requireAdmin, c.list);
router.post('/', requireAdmin, c.create);
router.post('/:id/login', requireAdmin, c.createSession);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;