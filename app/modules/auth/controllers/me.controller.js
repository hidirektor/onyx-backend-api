'use strict';

const BaseController = require('@core/base/controller/BaseController');
const { ProfileResponse } = require('../responses/AuthResponse');

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile.
 * Requires authMiddleware.withUser — req.user is a full Sequelize User instance.
 */
class MeController extends BaseController {
  handle = this.asyncHandler(async (req, res) => {
    return new ProfileResponse(req.user).send(res);
  });
}

module.exports = new MeController();
