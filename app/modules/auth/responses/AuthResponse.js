'use strict';

const BaseResponse = require('@core/base/response/BaseResponse');
const { StatusCodes } = require('http-status-codes');

class RegisterSuccess extends BaseResponse {
  constructor(user) {
    super(user.toPublicJSON(), 'Registration successful', StatusCodes.CREATED);
  }
}

class LoginSuccess extends BaseResponse {
  constructor({ user, token }) {
    super(
      {
        user: user.toPublicJSON ? user.toPublicJSON() : user,
        token,
      },
      'Login successful',
      StatusCodes.OK
    );
  }
}

class ProfileResponse extends BaseResponse {
  constructor(user) {
    super(
      user.toPublicJSON ? user.toPublicJSON() : user,
      'Profile retrieved successfully',
      StatusCodes.OK
    );
  }
}

module.exports = { RegisterSuccess, LoginSuccess, ProfileResponse };
