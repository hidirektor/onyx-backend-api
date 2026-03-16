'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class UserDevice extends BaseModel {
    static associate(db) {
      UserDevice.belongsTo(db.User, { foreignKey: 'userID', targetKey: 'userID', as: 'user' });
    }
  }

  UserDevice.init(
    {
      userDeviceID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        unique: true,
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
      browserInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Browser and OS information',
      },
      clientInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Client app/device information (mobile/web/api)',
      },
      deviceFingerprint: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Unique user-device identifier hash',
      },
      deviceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Device name (e.g., iPhone 13, Chrome on Windows)',
      },
      deviceType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'unknown',
        comment: 'Client type: web, mobile, api, or unknown',
      },
      firstLoginAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'First time this user-device was used',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address during login',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this device is still active',
      },
      isConfirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this device has been confirmed by the user',
      },
      isTrusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether user marked this device as trusted',
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Last time this user-device was used',
      },
      lastSuspiciousAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time suspicious activity was detected',
      },
      location: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Geographic location data',
      },
      loginCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of times logged in from this device',
      },
      networkFingerprint: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Network-aware device fingerprint (includes IP)',
      },
      requestMetadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional request metadata and headers',
      },
      securityRisk: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Security risk assessment data',
      },
      suspiciousActivity: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether suspicious activity was detected',
      },
      trustedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this device was marked as trusted',
      },
    },
    {
      sequelize,
      modelName: 'UserDevice',
      tableName: 'user_devices',
      timestamps: false,
      indexes: [
        { name: 'idx_user_device_unique',   unique: true, fields: ['userID', 'deviceFingerprint'] },
        { name: 'idx_user_device_login',    fields: ['userID', 'lastLoginAt'] },
        { name: 'idx_device_fingerprint',   fields: ['deviceFingerprint'] },
        { name: 'idx_user_devices_active',  fields: ['userID', 'isActive', 'lastLoginAt'] },
      ],
    }
  );

  return UserDevice;
};
