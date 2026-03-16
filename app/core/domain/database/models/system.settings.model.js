'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SystemSettings extends BaseModel {
    static associate() {}
  }

  SystemSettings.init(
    {
      systemSettingsId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // ─── Access Control ────────────────────────────────────────────────────
      geoRestrictionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Enforce country whitelist/blacklist on all requests',
      },
      newDeviceProtectionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Require OTP verification for unrecognized devices',
      },
      // ─── Session ──────────────────────────────────────────────────────────
      defaultSessionDuration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Default session duration in minutes',
      },
      afkThresholdSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 600,
        comment: 'Seconds of inactivity before user is considered AFK',
      },
      // ─── Support ──────────────────────────────────────────────────────────
      ticketClosingTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        comment: 'Days before a support ticket auto-closes after last response',
      },
      // ─── Profile ──────────────────────────────────────────────────────────
      profilePhotoApprovalEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Require admin approval for profile photo uploads',
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
