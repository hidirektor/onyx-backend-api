'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const dialCodes = require('@core/domain/enums/user/phone-dial-codes.enum');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class User extends BaseModel {
    static get hiddenFields() {
      return ['password'];
    }

    static associate(db) {
      User.hasOne(db.UserPreferences,          { foreignKey: 'userID', as: 'preferences' });
      User.hasOne(db.NotificationPreference,   { foreignKey: 'userID', as: 'notificationPrefs' });
      User.hasMany(db.UserDevice,              { foreignKey: 'userID', as: 'devices' });
      User.hasMany(db.AuditLog,               { foreignKey: 'performedBy', as: 'auditLogs' });
      User.hasMany(db.UserNotification,        { foreignKey: 'userID', as: 'userNotifications' });
      User.hasMany(db.SupportTicket,           { foreignKey: 'userID', as: 'supportTickets' });
      User.hasMany(db.SupportTicketResponse,   { foreignKey: 'userID', as: 'ticketResponses' });
      User.hasMany(db.AddressUserMapping,      { foreignKey: 'userID', as: 'addressMappings' });
      User.hasMany(db.UserProfilePhotoApproval, { foreignKey: 'userID', as: 'photoApprovals' });
    }
  }

  User.init(
    {
      userID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      eMail: {
        type: DataTypes.STRING(124),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email cannot be empty' },
        },
      },
      dialCode: {
        type: DataTypes.ENUM(...dialCodes),
        allowNull: false,
        comment: 'Phone number country code (e.g., +90)',
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      userName: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'First name of the user',
      },
      userSurname: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Last name of the user',
      },
      userType: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Type of user role',
      },
      accountType: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Type of user account',
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'CBU user passwords will not be stored in database. Hashed password for internal authentication',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      mailVerifiedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Email verification timestamp',
      },
      phoneVerifiedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Phone verification timestamp',
      },
      birthDate: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'User birth date as Unix timestamp',
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['eMail'] },
      ],
    }
  );

  return User;
};