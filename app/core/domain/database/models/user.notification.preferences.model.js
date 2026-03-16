'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

const DEFAULT_PREFS = { sms: true, inApp: true, email: true, push: true };

function jsonGetter(field) {
  return function () {
    const val = this.getDataValue(field);
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return { ...DEFAULT_PREFS }; }
    }
    return val || { ...DEFAULT_PREFS };
  };
}

function jsonSetter(field) {
  return function (val) {
    this.setDataValue(field, typeof val === 'object' && val !== null ? val : { ...DEFAULT_PREFS });
  };
}

module.exports = (sequelize) => {
  class NotificationPreference extends BaseModel {
    static associate(db) {
      NotificationPreference.belongsTo(db.User, { foreignKey: 'userID', targetKey: 'userID', as: 'user' });
    }
  }

  NotificationPreference.init(
    {
      userID: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'FK → users.userID',
      },
      generalNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Preferences for general notifications',
        get: jsonGetter('generalNotifications'),
        set: jsonSetter('generalNotifications'),
      },
      securityNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Preferences for security notifications',
        get: jsonGetter('securityNotifications'),
        set: jsonSetter('securityNotifications'),
      },
      newFeatureNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Preferences for new features notifications',
        get: jsonGetter('newFeatureNotifications'),
        set: jsonSetter('newFeatureNotifications'),
      },
    },
    {
      sequelize,
      modelName: 'NotificationPreference',
      tableName: 'user_notification_preferences',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userID'] }],
    }
  );

  return NotificationPreference;
};
