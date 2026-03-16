'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SystemSettings extends BaseModel {
    static associate() {}
  }

  SystemSettings.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // ─── Access Control ────────────────────────────────────────────────────
      allowPublicDomain: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Allow any email domain (false = institution domain only)',
      },
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
      // ─── Roll Call Settings ────────────────────────────────────────────────
      maxActiveRollCalls: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Max concurrent active roll calls per user',
      },
      defaultSessionDuration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Default roll call session duration (minutes)',
      },
      maximumRollCallTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 45,
        comment: 'Maximum roll call duration (minutes)',
      },
      maxPauseTimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40,
        comment: 'Max pause before roll call auto-ends (minutes)',
      },
      bypassLectureMapping: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allow any student to sign any roll call regardless of enrollment',
      },
      allowSelfSign: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allow users to sign their own roll call',
      },
      // ─── Session ──────────────────────────────────────────────────────────
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
        comment: 'Days before a support ticket auto-closes',
      },
      studentProfilePhotoApprovalEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Require admin approval for student profile photos',
      },
      // ─── Lecture Exclusions ────────────────────────────────────────────────
      outOfTermSemesterDateLectureNames: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Lecture name substrings that use semester dates for out-of-term checks',
      },
      excludedRollCallLectureNames: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Lecture name substrings that cannot have roll calls',
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
