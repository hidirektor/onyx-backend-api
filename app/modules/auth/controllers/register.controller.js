'use strict';

const BaseController = require('@core/base/controller/BaseController');
const AuthUtility = require('../utilities/AuthUtility');
const { RegisterSuccess } = require('../responses/AuthResponse');

const utility = new AuthUtility();

/**
 * POST /api/v1/auth/register
 * Creates a new user account.
 */
class RegisterController extends BaseController {
  handle = this.asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const user = await utility.registerUser({ name, email, password });
    return new RegisterSuccess(user).send(res);
  });
}

module.exports = new RegisterController();
