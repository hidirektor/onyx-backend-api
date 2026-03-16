'use strict';

const { Router } = require('express');

const router = Router();

router.use('/register', require('./register.route'));
router.use('/login',    require('./login.route'));
router.use('/me',       require('./me.route'));

module.exports = router;
