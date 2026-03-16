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
    return user.userID === req.params.id;
  }

  async viewAllUsers(user) {
    const userType = user?.userType;
    return userType === 'SYSOP' || userType === 'ADMIN';
  }

  async deactivateUser(user) {
    const userType = user?.userType;
    return userType === 'SYSOP' || userType === 'ADMIN';
  }
}

module.exports = AuthPolicy;
