'use strict';

const BaseController = require('@core/base/controller/BaseController');
const AuthUtility = require('../utilities/AuthUtility');
const { LoginSuccess } = require('../responses/AuthResponse');

const utility = new AuthUtility();

/**
 * POST /api/v1/auth/login
 * Authenticates a user and returns access + refresh tokens.
 */
class LoginController extends BaseController {
  handle = this.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await utility.loginUser(email, password);
    return new LoginSuccess(result).send(res);
  });
}

module.exports = new LoginController();
