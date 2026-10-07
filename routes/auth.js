const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', c.login);
router.post('/logout', requireAuth, c.logout);
router.get('/me', requireAuth, c.me);

module.exports = router;