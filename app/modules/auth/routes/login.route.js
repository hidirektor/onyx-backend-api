'use strict';

const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const loginController = require('../controllers/login.controller');
const AuthRateLimiter = require('../rate-limiters/AuthRateLimiter');

const router = Router();
const limiter = new AuthRateLimiter();

const schema = celebrate({
  [Segments.BODY]: Joi.object({
    email:    Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
  }),
});

router.post('/', limiter.middleware(), schema, loginController.handle);

module.exports = router;
