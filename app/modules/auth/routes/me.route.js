'use strict';

const { Router } = require('express');
const meController = require('../controllers/me.controller');
const AuthPolicy = require('../policies/AuthPolicy');
const authMiddleware = require('@infrastructure/setup/middleware/auth.middleware');

const router = Router();
const policy = new AuthPolicy();

router.get('/', authMiddleware.withUser, policy.can('viewOwnProfile'), meController.handle);

module.exports = router;
