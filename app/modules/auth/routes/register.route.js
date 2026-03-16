'use strict';

const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const registerController = require('../controllers/register.controller');
const AuthRateLimiter = require('../rate-limiters/AuthRateLimiter');

const router = Router();
const limiter = new AuthRateLimiter();

const schema = celebrate({
  [Segments.BODY]: Joi.object({
    name:     Joi.string().min(2).max(100).trim().required(),
    email:    Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required(),
  }),
});

router.post('/', limiter.middleware(), schema, registerController.handle);

module.exports = router;
