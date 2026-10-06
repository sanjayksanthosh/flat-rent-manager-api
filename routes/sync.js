const express = require('express');
const router = express.Router();
const c = require('../controllers/syncController');
router.get('/pull', c.pull);
module.exports = router;
