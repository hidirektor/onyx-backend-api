'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class UserDevice extends BaseModel {
    static associate(db) {
      UserDevice.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id' });
    }
  }

  UserDevice.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'FK → users.id',
      },
      deviceFingerprint: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Unique user-device identifier hash',
      },
      deviceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable device name (e.g. iPhone 13, Chrome on Windows)',
      },
      deviceType: {
        type: DataTypes.ENUM(...getEnumValues('request.deviceTypes')),
        allowNull: false,
        defaultValue: 'web',
        comment: 'Client type: web | mobile | agent',
      },
      browserInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Browser and OS metadata',
      },
      clientInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'App/device metadata (version, platform, etc.)',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IPv4 or IPv6 address at time of login',
      },
      location: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Geo-IP location data (country, city, coordinates)',
      },
      firstLoginAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'First login timestamp for this device',
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Most recent login timestamp',
      },
      isTrusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the user has marked this device as trusted',
      },
      isConfirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this device was confirmed via OTP',
      },
      trustedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when device was marked trusted',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this device record is active',
      },
      loginCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        comment: 'Total login count from this device',
      },
      networkFingerprint: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'IP-aware network fingerprint',
      },
      requestMetadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Raw request headers and metadata',
      },
      suspiciousActivity: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flagged for suspicious activity',
      },
      lastSuspiciousAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last suspicious activity timestamp',
      },
      securityRisk: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Security risk assessment payload (VPN, proxy, geo flags)',
      },
    },
    {
      sequelize,
      modelName: 'UserDevice',
      tableName: 'user_devices',
      timestamps: false,
      indexes: [
        { name: 'idx_user_device_unique', unique: true, fields: ['userId', 'deviceFingerprint'] },
        { name: 'idx_user_device_login', fields: ['userId', 'lastLoginAt'] },
        { name: 'idx_device_fingerprint', fields: ['deviceFingerprint'] },
        { name: 'idx_user_devices_active', fields: ['userId', 'isActive', 'lastLoginAt'] },
      ],
    }
  );

  return UserDevice;
};
