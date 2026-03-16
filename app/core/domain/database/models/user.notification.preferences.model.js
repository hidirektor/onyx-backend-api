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
      NotificationPreference.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'userId', as: 'user' });
    }
  }

  NotificationPreference.init(
    {
      notificationPreferenceId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'FK → users.userId',
      },
      generalNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: '{ sms, inApp, email, push }',
        get: jsonGetter('generalNotifications'),
        set: jsonSetter('generalNotifications'),
      },
      systemNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'System / security notification preferences',
        get: jsonGetter('systemNotifications'),
        set: jsonSetter('systemNotifications'),
      },
      announcementNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Announcement notification preferences',
        get: jsonGetter('announcementNotifications'),
        set: jsonSetter('announcementNotifications'),
      },
      supportNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Support ticket notification preferences',
        get: jsonGetter('supportNotifications'),
        set: jsonSetter('supportNotifications'),
      },
    },
    {
      sequelize,
      modelName: 'NotificationPreference',
      tableName: 'notification_preferences',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userId'] }],
    }
  );

  return NotificationPreference;
};
