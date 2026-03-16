'use strict';

jest.mock('@database/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('@database/models');
const AuthUtility = require('../utilities/AuthUtility');
const AuthPolicy = require('../policies/AuthPolicy');

// ─── AuthUtility ──────────────────────────────────────────────────────────────

describe('AuthUtility', () => {
  let utility;

  beforeEach(() => {
    utility = new AuthUtility();
    jest.clearAllMocks();
  });

  describe('registerUser()', () => {
    it('creates a user with a hashed password', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ id: 1, email: 'new@test.com' });

      const result = await utility.registerUser({ name: 'Alice', email: 'new@test.com', password: 'pass1234' });

      expect(bcrypt.hash).toHaveBeenCalledWith('pass1234', 12);
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed_password' }));
      expect(result).toHaveProperty('id', 1);
    });

    it('throws 409 when email already exists', async () => {
      User.findOne.mockResolvedValue({ id: 1 });

      await expect(utility.registerUser({ name: 'B', email: 'exist@test.com', password: 'pass' }))
        .rejects.toMatchObject({ statusCode: 409 });

      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser()', () => {
    const mockUser = {
      id: 1,
      email: 'u@test.com',
      password: 'hashed',
      isActive: true,
      role: 'student',
      update: jest.fn().mockResolvedValue(true),
    };

    it('returns user and tokens on valid credentials', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await utility.loginUser('u@test.com', 'pass1234');

      expect(result).toHaveProperty('token', 'mock_token');
      expect(result).toHaveProperty('refreshToken', 'mock_token');
      expect(mockUser.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
    });

    it('throws 401 when user not found', async () => {
      User.findOne.mockResolvedValue(null);
      await expect(utility.loginUser('x@test.com', 'pass')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when password is wrong', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      await expect(utility.loginUser('u@test.com', 'wrong')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 403 when account is disabled', async () => {
      User.findOne.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(utility.loginUser('u@test.com', 'pass')).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('generateToken()', () => {
    it('calls jwt.sign with correct args', () => {
      utility.generateToken({ id: 1 });
      expect(jwt.sign).toHaveBeenCalledWith({ id: 1 }, expect.any(String), expect.objectContaining({ expiresIn: expect.any(String) }));
    });
  });

  describe('hashPassword()', () => {
    it('delegates to bcrypt.hash with 12 rounds', async () => {
      await utility.hashPassword('secret');
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 12);
    });
  });
});

// ─── AuthPolicy ───────────────────────────────────────────────────────────────

describe('AuthPolicy', () => {
  let policy;
  beforeEach(() => { policy = new AuthPolicy(); });

  it('viewOwnProfile: true for authenticated user', async () => {
    expect(await policy.viewOwnProfile({ id: 1 })).toBe(true);
  });

  it('viewOwnProfile: false when user is null', async () => {
    expect(await policy.viewOwnProfile(null)).toBe(false);
  });

  it('updateOwnProfile: true when ids match', async () => {
    expect(await policy.updateOwnProfile({ id: 5 }, { params: { id: '5' } })).toBe(true);
  });

  it('updateOwnProfile: false when ids differ', async () => {
    expect(await policy.updateOwnProfile({ id: 5 }, { params: { id: '9' } })).toBe(false);
  });

  it('viewAllUsers: true only for admin role', async () => {
    expect(await policy.viewAllUsers({ role: 'admin' })).toBe(true);
    expect(await policy.viewAllUsers({ role: 'teacher' })).toBe(false);
    expect(await policy.viewAllUsers({ role: 'student' })).toBe(false);
    expect(await policy.viewAllUsers(null)).toBe(false);
  });
});
