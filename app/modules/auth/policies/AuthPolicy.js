'use strict';

const BasePolicy = require('@core/base/policy/BasePolicy');

/**
 * AuthPolicy - Authorization rules for the Auth module.
 *
 * Usage in routes:
 *   const policy = new AuthPolicy();
 *   router.get('/me', authMiddleware, policy.can('viewOwnProfile'), controller);
 */
class AuthPolicy extends BasePolicy {
  async viewOwnProfile(user) {
    return !!user;
  }

  async updateOwnProfile(user, req) {
    if (!user) return false;
    return user.id === parseInt(req.params.id, 10);
  }

  async viewAllUsers(user) {
    return user?.role === 'admin';
  }

  async deactivateUser(user) {
    return user?.role === 'admin';
  }
}

module.exports = AuthPolicy;
