'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SystemSettings extends BaseModel {
    static associate() {}
  }

  SystemSettings.init(
    {
      settingsID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      afkThresholdSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 600,
        comment: 'AFK threshold in seconds (user is considered AFK after this many seconds of inactivity)',
      },
      defaultSessionDuration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Default roll call session duration in minutes',
      },
      geoRestrictionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Geo restriction enabled (true: only accept requests from Turkey, false: accept from anywhere)',
      },
      newDeviceProtectionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'New device protection enabled (true: require OTP verification for new devices, false: allow all devices without verification)',
      },
      profilePhotoApprovalEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Require approval for student profile photo uploads',
      },
      ticketClosingTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        comment: 'Days before ticket auto-closes',
      },
    },
    {
      sequelize,
      modelName: 'SystemSettings',
      tableName: 'system_settings',
      timestamps: false,
    }
  );

  return SystemSettings;
};
