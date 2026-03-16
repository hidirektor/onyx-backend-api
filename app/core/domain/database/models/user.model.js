'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class User extends BaseModel {
    static get hiddenFields() {
      return ['password', 'deletedAt'];
    }

    static associate(db) {
      User.hasOne(db.UserProfile,              { foreignKey: 'userId', as: 'profile' });
      User.hasOne(db.UserPreferences,          { foreignKey: 'userId', as: 'preferences' });
      User.hasOne(db.NotificationPreference,   { foreignKey: 'userId', as: 'notificationPrefs' });
      User.hasMany(db.UserDevice,              { foreignKey: 'userId', as: 'devices' });
      User.hasMany(db.AuditLog,               { foreignKey: 'performedBy', as: 'auditLogs' });
      User.hasMany(db.UserNotification,        { foreignKey: 'userId', as: 'userNotifications' });
      User.hasMany(db.SupportTicket,           { foreignKey: 'userId', as: 'supportTickets' });
      User.hasMany(db.SupportTicketResponse,   { foreignKey: 'respondedBy', as: 'ticketResponses' });
      User.hasMany(db.AddressUserMapping,      { foreignKey: 'userId', as: 'addressMappings' });
    }
  }

  User.init(
    {
      userId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Username cannot be empty' },
          len: { args: [3, 50], msg: 'Username must be between 3 and 50 characters' },
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email cannot be empty' },
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      paranoid: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['username'] },
        { fields: ['role'] },
        { fields: ['isActive'] },
      ],
    }
  );

  return User;
};
